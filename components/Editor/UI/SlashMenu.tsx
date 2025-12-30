import React, { useRef, useState, useEffect } from 'react';
import { BlockType } from '../../../types';
import { BLOCK_TYPES } from '../constants';

interface SlashMenuProps {
    position: { top: number, left: number };
    filter: string;
    onSelect: (type: BlockType) => void;
    onClose: () => void;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ position, filter, onSelect, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLButtonElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredOptions = BLOCK_TYPES.filter(t => t.label.toLowerCase().includes(filter.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filter]);

    useEffect(() => {
        if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredOptions[selectedIndex]) {
                    onSelect(filteredOptions[selectedIndex].type);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, filteredOptions, onSelect, onClose]);

    if (filteredOptions.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg w-64 max-h-80 overflow-y-auto z-50 flex flex-col p-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left }}
        >
            <div className="text-xs font-semibold text-gray-400 px-2 py-1.5 uppercase tracking-wider">Basic blocks</div>
            {filteredOptions.map((option, idx) => (
                <button
                    key={option.type}
                    ref={idx === selectedIndex ? selectedItemRef : null}
                    onClick={() => onSelect(option.type)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left ${idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    <div className="p-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm">{option.icon}</div>
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    )
}
