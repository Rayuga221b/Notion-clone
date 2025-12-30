import React, { useState } from 'react';
import { Page } from '../../../types';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';

interface PageSelectorProps {
    pages: Page[];
    onSelect: (pageId: string, title: string) => void;
    onClose: () => void;
    position: { top: number, left: number };
}

export const PageSelector: React.FC<PageSelectorProps> = ({ pages, onSelect, onClose, position }) => {
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const renderPageItem = (page: Page, depth: number) => {
        const children = pages.filter(p => p.parentId === page.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.includes(page.id);

        return (
            <div key={page.id} className="flex flex-col">
                <div
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer group"
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => onSelect(page.id, page.title)}
                >
                    <div
                        className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        onClick={(e) => hasChildren && toggleExpand(e, page.id)}
                    >
                        {hasChildren && (
                            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                        )}
                    </div>
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-sm truncate text-gray-700 dark:text-gray-300">{page.title}</span>
                </div>
                {isExpanded && children.map(child => renderPageItem(child, depth + 1))}
            </div>
        );
    };

    const rootPages = pages.filter(p => !p.parentId);

    return (
        <>
            <div
                className="fixed inset-0 z-[60]"
                onClick={onClose}
            />
            <div
                className="fixed z-[70] w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-1"
                style={{ top: position.top, left: position.left }}
            >
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Select Page to Link
                </div>
                {rootPages.map(page => renderPageItem(page, 0))}
                {pages.length === 0 && (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                        No pages found
                    </div>
                )}
            </div>
        </>
    );
};
