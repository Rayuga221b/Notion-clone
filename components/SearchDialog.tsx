import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText } from 'lucide-react';
import { Page } from '../types';

interface SearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    pages: Page[];
    onSelect: (pageId: string) => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({ isOpen, onClose, pages, onSelect }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredPages = pages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredPages.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredPages[selectedIndex]) {
                    onSelect(filteredPages[selectedIndex].id);
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredPages, onSelect, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 border border-gray-200 dark:border-gray-700 mx-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <Search className="text-gray-400" size={20} />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        placeholder="Search pages..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto py-2">
                    {filteredPages.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">No pages found</div>
                    ) : (
                        filteredPages.map((page, idx) => (
                            <div
                                key={page.id}
                                className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                onClick={() => { onSelect(page.id); onClose(); }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <FileText size={18} className="text-gray-400" />
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate ${idx === selectedIndex ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {page.title}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
                    <span>Total {filteredPages.length} pages</span>
                    <div className="flex gap-2">
                        <span>↑↓ to navigate</span>
                        <span>↵ to select</span>
                        <span>esc to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchDialog;
