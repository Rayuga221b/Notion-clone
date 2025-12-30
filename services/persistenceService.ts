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
    writeBatch
} from 'firebase/firestore';
import { Page, Transaction } from '../types';

class PersistenceService {
    private debounces: Map<string, NodeJS.Timeout> = new Map();

    async fetchPages(userId: string): Promise<Page[]> {
        // Try cache first
        const cached = localStorage.getItem(`pages_${userId}`);
        const parsedCached = cached ? JSON.parse(cached) : null;

        const q = query(collection(db, 'pages'), where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const pages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                updatedAt: (data.updatedAt as Timestamp).toDate()
            } as Page;
        });

        localStorage.setItem(`pages_${userId}`, JSON.stringify(pages));
        return pages;
    }

    async savePage(userId: string, page: Page, debounceMs: number = 2000) {
        // Update local cache immediately
        const cached = localStorage.getItem(`pages_${userId}`);
        if (cached) {
            const pages = JSON.parse(cached) as Page[];
            const index = pages.findIndex(p => p.id === page.id);
            if (index !== -1) {
                pages[index] = page;
            } else {
                pages.push(page);
            }
            localStorage.setItem(`pages_${userId}`, JSON.stringify(pages));
        }

        // Clear existing debounce for this page
        if (this.debounces.has(page.id)) {
            clearTimeout(this.debounces.get(page.id));
        }

        return new Promise<void>((resolve) => {
            const timeout = setTimeout(async () => {
                try {
                    await setDoc(doc(db, 'pages', page.id), {
                        ...page,
                        ownerId: userId,
                        updatedAt: Timestamp.fromDate(new Date())
                    }, { merge: true });
                    this.debounces.delete(page.id);
                    resolve();
                } catch (error) {
                    console.error('Error saving page:', error);
                    resolve();
                }
            }, debounceMs);

            this.debounces.set(page.id, timeout);
        });
    }

    async deletePage(pageId: string) {
        if (this.debounces.has(pageId)) {
            clearTimeout(this.debounces.get(pageId));
            this.debounces.delete(pageId);
        }
        await deleteDoc(doc(db, 'pages', pageId));
    }

    // Transaction methods
    async fetchTransactions(userId: string): Promise<Transaction[]> {
        const q = query(collection(db, 'expenses'), where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const ts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        localStorage.setItem(`transactions_${userId}`, JSON.stringify(ts));
        return ts;
    }

    async saveTransaction(userId: string, transaction: Transaction) {
        const cached = localStorage.getItem(`transactions_${userId}`);
        if (cached) {
            const ts = JSON.parse(cached) as Transaction[];
            const index = ts.findIndex(t => t.id === transaction.id);
            if (index !== -1) ts[index] = transaction;
            else ts.push(transaction);
            localStorage.setItem(`transactions_${userId}`, JSON.stringify(ts));
        }
        await setDoc(doc(db, 'expenses', transaction.id), {
            ...transaction,
            ownerId: userId
        });
    }

    async deleteTransaction(transactionId: string) {
        await deleteDoc(doc(db, 'expenses', transactionId));
    }

    // User Profile methods
    async fetchUserProfile(userId: string) {
        const cached = localStorage.getItem(`user_profile_${userId}`);
        if (cached) return JSON.parse(cached);

        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
            return data;
        }
        return null;
    }

    async saveUserProfile(userId: string, data: any) {
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
        await setDoc(doc(db, 'users', userId), data, { merge: true });
    }
}

export const persistenceService = new PersistenceService();
