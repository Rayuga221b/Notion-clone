import React, { useState } from 'react';
import { Workspace } from '../types';
import { persistenceService } from '../services/persistenceService';
import { Plus, Users, Check, ChevronDown, Settings, Trash2, Copy, LogOut } from 'lucide-react';

interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    activeWorkspaceId: string;
    onWorkspaceChange: (workspaceId: string) => void;
    onWorkspaceCreated: (workspace: Workspace) => void;
    onJoinRequest: () => void;
    userId: string;
    userEmail?: string;
    onWorkspaceRenamed: (id: string, name: string) => void;
    onWorkspaceDeleted: (id: string) => void;
    onWorkspaceLeft?: (id: string) => void;
    onWorkspaceSettingsChanged?: (id: string, settings: Partial<Workspace>) => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
    workspaces,
    activeWorkspaceId,
    onWorkspaceChange,
    onWorkspaceCreated,
    onJoinRequest,
    userId,
    userEmail,
    onWorkspaceRenamed,
    onWorkspaceDeleted,
    onWorkspaceLeft,
    onWorkspaceSettingsChanged
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [copied, setCopied] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [membersCanEdit, setMembersCanEdit] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const isOwner = activeWorkspace?.ownerId === userId;

    // Debug logging
    console.log("WorkspaceSelector Debug:", {
        activeWorkspace: activeWorkspace?.name,
        activeOwnerId: activeWorkspace?.ownerId,
        currentUserId: userId,
        isOwner,
        isProtected: activeWorkspace?.isProtected
    });

    const handleCopyCode = () => {
        if (!activeWorkspace?.inviteCode) return;
        navigator.clipboard.writeText(activeWorkspace.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRename = async () => {
        if (!activeWorkspace || !editName.trim() || activeWorkspace.isProtected) return;
        try {
            await persistenceService.renameWorkspace(activeWorkspace.id, editName);
            onWorkspaceRenamed(activeWorkspace.id, editName);
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleMembersCanEdit = async () => {
        if (!activeWorkspace || !isOwner) return;
        const newValue = !membersCanEdit;
        try {
            await persistenceService.updateWorkspaceSettings(activeWorkspace.id, { membersCanEdit: newValue });
            setMembersCanEdit(newValue);
            onWorkspaceSettingsChanged?.(activeWorkspace.id, { membersCanEdit: newValue });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!activeWorkspace || activeWorkspace.isProtected) return;
        try {
            console.log("Deleting workspace:", activeWorkspace.id);
            await persistenceService.deleteWorkspace(activeWorkspace.id);
            onWorkspaceDeleted(activeWorkspace.id);
            setConfirmDelete(false);
            setIsSettingsOpen(false);
        } catch (e) {
            console.error("Delete failed:", e);
        }
    };

    const handleLeave = async () => {
        if (!activeWorkspace) return;
        try {
            await persistenceService.leaveWorkspace(activeWorkspace.id, userId);
            onWorkspaceLeft?.(activeWorkspace.id);
            setConfirmLeave(false);
            setIsSettingsOpen(false);
        } catch (e) {
            console.error("Leave failed:", e);
        }
    };

    const submitCreate = async (type: 'private' | 'public') => {
        console.log("submitCreate called", { newWorkspaceName, type, userId });
        if (!newWorkspaceName.trim()) {
            console.log("submitCreate blocked: empty name");
            return;
        }
        try {
            console.log("Creating workspace:", newWorkspaceName, type);
            const newWs = await persistenceService.createWorkspace(userId, newWorkspaceName, type);
            console.log("Workspace created:", newWs);
            onWorkspaceCreated(newWs);
            setIsCreating(false);
            setNewWorkspaceName('');
        } catch (e) {
            console.error("Create workspace failed:", e);
        }
    };

    // Sync local state when settings modal opens
    const openSettings = () => {
        setEditName(activeWorkspace?.name || '');
        setMembersCanEdit(activeWorkspace?.membersCanEdit || false);
        setIsSettingsOpen(true);
        setIsDropdownOpen(false);
    };

    return (
        <div className="relative mb-4 px-2">
            {/* Main Switcher Button */}
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#EFEFED] dark:hover:bg-gray-800 transition-colors group"
            >
                <div className="w-5 h-5 bg-gradient-to-br from-orange-400 to-orange-600 rounded text-white text-[10px] flex items-center justify-center font-bold shadow-sm">
                    {activeWorkspace?.name.charAt(0).toUpperCase() || 'W'}
                </div>
                <div className="flex-1 flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full text-left">
                        {activeWorkspace?.name || 'Loading...'}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate leading-none">
                        {activeWorkspace?.type === 'public' ? 'Team Workspace' : 'Personal Plan'}
                    </span>
                </div>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-2 right-2 mt-1 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2C2C2C] rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#252525]">
                            {userEmail}
                        </div>

                        <div className="max-h-60 overflow-y-auto py-1">
                            {workspaces.map(ws => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        onWorkspaceChange(ws.id);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors
                                        ${ws.id === activeWorkspaceId ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ws.type === 'public' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                                            {ws.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{ws.name}</span>
                                    </div>
                                    {ws.id === activeWorkspaceId && <Check size={14} />}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 dark:border-[#2C2C2C] p-1 bg-gray-50 dark:bg-[#252525]">
                            <button
                                onClick={openSettings}
                                className="w-full text-left px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333] rounded flex items-center gap-2 transition-colors"
                            >
                                <Settings size={14} />
                                Workspace Settings
                            </button>
                            <button
                                onClick={() => {
                                    setNewWorkspaceName('');
                                    setIsCreating(true);
                                    setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333] rounded flex items-center gap-2 transition-colors"
                            >
                                <Plus size={14} />
                                Create Workspace
                            </button>
                            <button
                                onClick={() => {
                                    onJoinRequest();
                                    setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333] rounded flex items-center gap-2 transition-colors"
                            >
                                <Users size={14} />
                                Join Team
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Workspace Settings Modal */}
            {isSettingsOpen && activeWorkspace && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="absolute inset-0" onClick={() => setIsSettingsOpen(false)} />

                    <div className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2C2C2C] p-6 rounded-xl w-96 shadow-2xl animate-in fade-in zoom-in-95 relative z-10">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <Settings size={20} />
                            Workspace Settings
                        </h2>

                        {/* Rename Section - Only for non-protected workspaces and owners */}
                        {isOwner && !activeWorkspace.isProtected && (
                            <div className="mb-6">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Workspace Name
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="flex-1 bg-gray-50 dark:bg-[#2C2C2C] text-gray-900 dark:text-gray-200 px-3 py-2 rounded-lg border border-gray-200 dark:border-transparent focus:border-blue-500 outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleRename}
                                        disabled={editName === activeWorkspace.name}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Invite Code Section (Public Only) */}
                        {activeWorkspace.type === 'public' && (
                            <div className="mb-6">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Invite Code
                                </label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-gray-50 dark:bg-[#2C2C2C] text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-lg font-mono font-bold tracking-widest text-center border border-gray-200 dark:border-transparent">
                                        {activeWorkspace.inviteCode}
                                    </code>
                                    <button
                                        onClick={handleCopyCode}
                                        className="px-3 py-2 bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#444] transition-colors"
                                        title="Copy Code"
                                    >
                                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2">
                                    Share this code with anyone you want to invite to this workspace.
                                </p>
                            </div>
                        )}

                        {/* Members Can Edit Toggle (Public Only, Owner Only) */}
                        {activeWorkspace.type === 'public' && isOwner && (
                            <div className="mb-6">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Permissions
                                </label>
                                <div
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg cursor-pointer"
                                    onClick={handleToggleMembersCanEdit}
                                >
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Members can edit pages</span>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${membersCanEdit ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${membersCanEdit ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Danger Zone - Delete (Owner only, non-protected) */}
                        {isOwner && !activeWorkspace.isProtected && (
                            <div className="pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
                                <label className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 block">
                                    Danger Zone
                                </label>
                                {!confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="w-full py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete Workspace
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            Are you sure? This cannot be undone.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDelete}
                                                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                            >
                                                Yes, Delete
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                className="flex-1 py-2 bg-gray-100 text-gray-700 dark:bg-[#333] dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#444] transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Leave Workspace (Non-owner of public workspace) */}
                        {!isOwner && activeWorkspace.type === 'public' && (
                            <div className="pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
                                {!confirmLeave ? (
                                    <button
                                        onClick={() => setConfirmLeave(true)}
                                        className="w-full py-2 bg-gray-100 text-gray-700 dark:bg-[#333] dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#444] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogOut size={16} />
                                        Leave Workspace
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Are you sure you want to leave this workspace?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleLeave}
                                                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                            >
                                                Yes, Leave
                                            </button>
                                            <button
                                                onClick={() => setConfirmLeave(false)}
                                                className="flex-1 py-2 bg-gray-100 text-gray-700 dark:bg-[#333] dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#444] transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2C2C2C] p-6 rounded-xl w-96 shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create Workspace</h2>
                        <input
                            autoFocus
                            placeholder="Workspace Name (e.g., Engineering Team)"
                            value={newWorkspaceName}
                            onChange={e => setNewWorkspaceName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2C] text-gray-900 dark:text-gray-200 px-4 py-2 rounded-lg mb-4 border border-gray-200 dark:border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                        />
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => submitCreate('public')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                Create Team
                            </button>
                            <button onClick={() => submitCreate('private')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#333] dark:hover:bg-[#444] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                                Private
                            </button>
                        </div>
                        <button onClick={() => setIsCreating(false)} className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}
        </div >
    );
};
