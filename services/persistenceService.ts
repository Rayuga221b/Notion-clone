import { db } from './firebaseConfig';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    getDoc,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    writeBatch
} from 'firebase/firestore';
import { Page, Workspace, UserProfile } from '../types';

class PersistenceService {
    private debounces: Map<string, NodeJS.Timeout> = new Map();

    // ==========================================
    // WORKSPACE METHODS
    // ==========================================

    async createWorkspace(userId: string, name: string, type: 'private' | 'public', isProtected: boolean = false): Promise<Workspace> {
        const workspaceId = doc(collection(db, 'workspaces')).id;

        const workspaceData: any = {
            name,
            type,
            ownerId: userId,
            createdAt: Timestamp.fromDate(new Date()),
            isProtected
        };

        if (type === 'public') {
            workspaceData.inviteCode = this.generateInviteCode();
            workspaceData.membersCanEdit = false; // Default: members cannot edit
        }

        // 1. Create Workspace Doc FIRST (so member creation can verify ownership)
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await setDoc(workspaceRef, workspaceData);

        // 2. Add Owner as Member (now workspace exists, rule can verify ownership)
        const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
        await setDoc(memberRef, {
            role: 'owner',
            joinedAt: Timestamp.now()
        });

        // 3. Update User's Workspace List
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            workspaceIds: arrayUnion(workspaceId)
        });

        return {
            id: workspaceId,
            ...workspaceData,
            createdAt: workspaceData.createdAt.toDate(),
            role: 'owner'
        };
    }

    /**
     * Fetches user workspaces using individual document fetches.
     * While less efficient than batched queries, this approach is more reliable
     * and handles race conditions with newly created/joined workspaces correctly.
     */
    async fetchUserWorkspaces(workspaceIds: string[], userId: string): Promise<Workspace[]> {
        if (!workspaceIds || workspaceIds.length === 0) return [];

        const promises = workspaceIds.map(async (id) => {
            try {
                const snap = await getDoc(doc(db, 'workspaces', id));
                if (snap.exists()) {
                    const data = snap.data();
                    // Also fetch user's role
                    const memberSnap = await getDoc(doc(db, 'workspaces', id, 'members', userId));
                    return {
                        id: snap.id,
                        name: data.name,
                        type: data.type,
                        ownerId: data.ownerId,
                        inviteCode: data.inviteCode,
                        createdAt: (data.createdAt as Timestamp).toDate(),
                        isProtected: data.isProtected || false,
                        membersCanEdit: data.membersCanEdit || false,
                        role: memberSnap.exists() ? memberSnap.data()?.role : 'member'
                    } as Workspace;
                }
            } catch (e) {
                console.warn(`Could not fetch workspace ${id}:`, e);
            }
            return null;
        });

        const results = await Promise.all(promises);
        return results.filter((w): w is Workspace => w !== null);
    }

    async joinWorkspaceByInvite(userId: string, inviteCode: string): Promise<Workspace | null> {
        console.log("joinWorkspaceByInvite START", { inviteCode, userId });

        // Query for workspace with this invite code
        const q = query(
            collection(db, 'workspaces'),
            where('inviteCode', '==', inviteCode),
            where('type', '==', 'public')
        );

        try {
            console.log("Step 1: Querying workspaces...");
            const sn = await getDocs(q);
            console.log("Step 1 complete: Query results empty:", sn.empty);

            let workspaceDoc;
            if (sn.empty) {
                console.log("Step 1b: Fallback query without type filter...");
                const q2 = query(collection(db, 'workspaces'), where('inviteCode', '==', inviteCode));
                const sn2 = await getDocs(q2);
                console.log("Step 1b complete: Fallback query empty:", sn2.empty);
                if (sn2.empty) return null;

                // If found here, check if it's public manually
                if (sn2.docs[0].data().type !== 'public') {
                    console.log("Workspace is not public, cannot join");
                    return null;
                }
                workspaceDoc = sn2.docs[0];
            } else {
                workspaceDoc = sn.docs[0];
            }

            const workspaceId = workspaceDoc.id;
            const workspaceData = workspaceDoc.data();
            console.log("Found workspace:", workspaceId, workspaceData.name);

            // Check if already a member
            console.log("Step 2: Checking member doc...");
            const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
            const memberSnap = await getDoc(memberRef);
            console.log("Step 2 complete: Member exists:", memberSnap.exists());

            if (!memberSnap.exists()) {
                console.log("Step 3: Creating member doc...");
                await setDoc(memberRef, {
                    role: 'member',
                    joinedAt: Timestamp.now()
                });
                console.log("Step 3 complete: Member doc created");

                console.log("Step 4: Updating user profile...");
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    workspaceIds: arrayUnion(workspaceId)
                });
                console.log("Step 4 complete: User profile updated");

                console.log("Join successful!");
            } else {
                console.log("User already a member. Role:", memberSnap.data()?.role);
            }

            return {
                id: workspaceId,
                name: workspaceData.name,
                type: workspaceData.type,
                ownerId: workspaceData.ownerId,
                inviteCode: workspaceData.inviteCode,
                createdAt: (workspaceData.createdAt as Timestamp).toDate(),
                role: memberSnap.exists() ? memberSnap.data()?.role : 'member'
            } as Workspace;
        } catch (error) {
            console.error("Error in joinWorkspaceByInvite:", error);
            throw error;
        }
    }

    async renameWorkspace(workspaceId: string, newName: string) {
        await updateDoc(doc(db, 'workspaces', workspaceId), {
            name: newName
        });
    }

    async updateWorkspaceSettings(workspaceId: string, settings: { membersCanEdit?: boolean }) {
        await updateDoc(doc(db, 'workspaces', workspaceId), settings);
    }

    async deleteWorkspace(workspaceId: string) {
        // Security rules will prevent deletion of protected workspaces
        await deleteDoc(doc(db, 'workspaces', workspaceId));
        // Note: Members' workspaceIds arrays will self-heal on next fetch (null filter)
    }

    async leaveWorkspace(workspaceId: string, userId: string) {
        const batch = writeBatch(db);

        // 1. Remove from members subcollection
        const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
        batch.delete(memberRef);

        // 2. Remove from user's workspaceIds
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
            workspaceIds: arrayRemove(workspaceId)
        });

        await batch.commit();
    }

    // ==========================================
    // PAGE METHODS (Scoped to Workspace)
    // ==========================================

    async fetchPages(workspaceId: string): Promise<Page[]> {
        // Try cache first
        const cacheKey = `pages_${workspaceId}`;
        const cached = localStorage.getItem(cacheKey);

        // Return cached immediately if available, but trigger fresh fetch
        // Or standard: await fetch.
        // Let's stick to simple await for now to ensure data consistency during dev.

        const q = query(collection(db, 'workspaces', workspaceId, 'pages'));
        const snapshot = await getDocs(q);
        const pages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                updatedAt: (data.updatedAt as Timestamp).toDate()
            } as Page;
        });

        localStorage.setItem(cacheKey, JSON.stringify(pages));
        return pages;
    }

    async savePage(workspaceId: string, page: Page, debounceMs: number = 2000) {
        // Update local cache immediately
        const cacheKey = `pages_${workspaceId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const pages = JSON.parse(cached) as Page[];
            const index = pages.findIndex(p => p.id === page.id);
            if (index !== -1) {
                pages[index] = page;
            } else {
                pages.push(page);
            }
            localStorage.setItem(cacheKey, JSON.stringify(pages));
        }

        // Debounce Firestore Write
        // Unique debounce key by workspace+page
        const debounceKey = `${workspaceId}_${page.id}`;
        if (this.debounces.has(debounceKey)) {
            clearTimeout(this.debounces.get(debounceKey));
        }

        return new Promise<void>((resolve) => {
            const timeout = setTimeout(async () => {
                try {
                    await setDoc(doc(db, 'workspaces', workspaceId, 'pages', page.id), {
                        ...page,
                        updatedAt: Timestamp.fromDate(new Date())
                    }, { merge: true });
                    this.debounces.delete(debounceKey);
                    resolve();
                } catch (error) {
                    console.error('Error saving page:', error);
                    resolve();
                }
            }, debounceMs);

            this.debounces.set(debounceKey, timeout);
        });
    }

    async savePageMetadata(workspaceId: string, updates: Partial<Page> & { id: string }) {
        const cacheKey = `pages_${workspaceId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const pages = JSON.parse(cached) as Page[];
            const index = pages.findIndex(p => p.id === updates.id);
            if (index !== -1) {
                pages[index] = { ...pages[index], ...updates };
                localStorage.setItem(cacheKey, JSON.stringify(pages));
            }
        }

        try {
            await setDoc(doc(db, 'workspaces', workspaceId, 'pages', updates.id), {
                ...updates,
                updatedAt: Timestamp.fromDate(new Date())
            }, { merge: true });
        } catch (error) {
            console.error('Error saving page metadata:', error);
        }
    }

    async deletePage(workspaceId: string, pageId: string) {
        const debounceKey = `${workspaceId}_${pageId}`;
        if (this.debounces.has(debounceKey)) {
            clearTimeout(this.debounces.get(debounceKey));
            this.debounces.delete(debounceKey);
        }
        await deleteDoc(doc(db, 'workspaces', workspaceId, 'pages', pageId));

        // Update Cache
        const cacheKey = `pages_${workspaceId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const pages = JSON.parse(cached) as Page[];
            const newPages = pages.filter(p => p.id !== pageId);
            localStorage.setItem(cacheKey, JSON.stringify(newPages));
        }
    }

    // ==========================================
    // USER METHODS
    // ==========================================

    async fetchUserProfile(userId: string): Promise<UserProfile | null> {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: userId, ...docSnap.data() } as UserProfile;
        }
        return null;
    }

    async createUserProfile(user: any) { // user is Firebase User object
        const userProfile: UserProfile = {
            id: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            workspaceIds: []
        };
        await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
        return userProfile;
    }

    async saveUserProfile(userId: string, data: Partial<UserProfile>) {
        await setDoc(doc(db, 'users', userId), data, { merge: true });
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private generateInviteCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

export const persistenceService = new PersistenceService();
