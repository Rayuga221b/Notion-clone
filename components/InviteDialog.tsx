import React, { useState } from 'react';
import { Workspace } from '../types';
import { persistenceService } from '../services/persistenceService';

interface InviteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onJoin: (workspace: Workspace) => void;
    userId: string;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({ isOpen, onClose, onJoin, userId }) => {
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleJoin = async () => {
        if (!inviteCode.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const workspace = await persistenceService.joinWorkspaceByInvite(userId, inviteCode.trim().toUpperCase());
            if (workspace) {
                onJoin(workspace);
                onClose();
            } else {
                setError('Workspace not found or is not public.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to join workspace.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1C1C1C] border border-[#2C2C2C] p-6 rounded-lg w-96 shadow-xl">
                <h2 className="text-xl font-bold text-gray-200 mb-4">Join Workspace</h2>

                <input
                    type="text"
                    placeholder="Enter 6-char Invite Code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#2C2C2C] text-gray-200 px-4 py-2 rounded mb-2 border border-transparent focus:border-blue-500 outline-none"
                    maxLength={6}
                />

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleJoin}
                        disabled={isLoading || !inviteCode}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Joining...' : 'Join'}
                    </button>
                </div>
            </div>
        </div>
    );
};
