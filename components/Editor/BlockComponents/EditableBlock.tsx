import React, { useRef, useEffect } from 'react';
import { Block, BlockType } from '../../../types';
import { CheckSquare, ChevronRight, ChevronDown, Info, Plus, FileText, Link } from 'lucide-react';

interface EditableBlockProps {
    block: Block;
    isFocused: boolean;
    onUpdate: (updates: Partial<Block>) => void;
    onFocus: () => void;
    onAddNext: () => void;
    onDelete: () => void;
    onOpenMenu: (rect: DOMRect) => void;
    slashMenuOpen: boolean;
    onSlashFilterChange: (filter: string) => void;
    onNavigateUp: () => void;
    onNavigateDown: () => void;
    onRequestSuggestion: () => void;
    onNavigateToPage?: (pageId: string) => void;
    indexInList?: number;
}

export const EditableBlock: React.FC<EditableBlockProps> = ({
    block, isFocused, onUpdate, onFocus, onAddNext, onDelete,
    onOpenMenu, slashMenuOpen, onSlashFilterChange, onNavigateUp, onNavigateDown, onRequestSuggestion,
    indexInList, onNavigateToPage
}) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Sync content updates
    useEffect(() => {
        if (contentRef.current && block.content !== contentRef.current.innerHTML) {
            contentRef.current.innerHTML = block.content;
        }
    }, [block.content]);

    // Focus Management
    useEffect(() => {
        if (isFocused && contentRef.current) {
            if (document.activeElement !== contentRef.current) {
                contentRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(contentRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
    }, [isFocused]);

    // Handle Input
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        const textContent = e.currentTarget.innerText;

        if (slashMenuOpen) {
            const match = textContent.match(/\/(.*)$/);
            if (match) {
                onSlashFilterChange(match[1]);
            } else {
                onSlashFilterChange(textContent);
            }
        }

        if (textContent.endsWith('\u00A0') || textContent.endsWith(' ')) {
            const cleanText = textContent.trim();
            let matchedType: BlockType | null = null;
            if (cleanText === '#') matchedType = BlockType.Heading1;
            else if (cleanText === '##') matchedType = BlockType.Heading2;
            else if (cleanText === '###') matchedType = BlockType.Heading3;
            else if (cleanText === '####') matchedType = BlockType.Heading4;
            else if (cleanText === '#####') matchedType = BlockType.Heading5;
            else if (cleanText === '>') matchedType = BlockType.Quote;
            else if (cleanText === '-' || cleanText === '*') matchedType = BlockType.Bullet;
            else if (cleanText === '[]') matchedType = BlockType.Todo;
            else if (cleanText === '1.') matchedType = BlockType.Number;
            else if (cleanText === '---') matchedType = BlockType.Divider;
            else if (cleanText === '```') matchedType = BlockType.Code;

            if (matchedType) {
                onUpdate({ type: matchedType, content: '' });
                if (contentRef.current) contentRef.current.innerHTML = '';
                return;
            }
        }

        onUpdate({ content: newContent });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '/') {
            setTimeout(() => {
                if (contentRef.current) {
                    const rect = contentRef.current.getBoundingClientRect();
                    onOpenMenu(rect);
                }
            }, 0);
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            if (!slashMenuOpen) {
                if (contentRef.current?.textContent === '---') {
                    e.preventDefault();
                    onUpdate({ type: BlockType.Divider, content: '' });
                    return;
                }
                e.preventDefault();
                onAddNext();
            }
        } else if (e.key === 'Backspace') {
            if (block.type === BlockType.Page || block.type === BlockType.PageLink) {
                e.preventDefault();
                onDelete();
                return;
            }
            if (!contentRef.current?.textContent) {
                e.preventDefault();
                if (block.type === BlockType.Divider) {
                    onDelete();
                } else if (block.type !== BlockType.Text) {
                    onUpdate({ type: BlockType.Text });
                } else {
                    onDelete();
                }
            }
        } else if (e.key === 'ArrowUp') {
            if (!slashMenuOpen) {
                e.preventDefault();
                onNavigateUp();
            }
        } else if (e.key === 'ArrowDown') {
            if (!slashMenuOpen) {
                e.preventDefault();
                onNavigateDown();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            onRequestSuggestion();
        }
    };

    const getBlockStyles = () => {
        switch (block.type) {
            case BlockType.Heading1: return "text-4xl font-bold mt-6 mb-2 dark:text-gray-100";
            case BlockType.Heading2: return "text-3xl font-bold mt-5 mb-2 dark:text-gray-100";
            case BlockType.Heading3: return "text-2xl font-semibold mt-4 mb-2 dark:text-gray-200";
            case BlockType.Heading4: return "text-xl font-semibold mt-3 mb-1 dark:text-gray-200";
            case BlockType.Heading5: return "text-lg font-semibold mt-2 mb-1 dark:text-gray-300";
            case BlockType.Heading6: return "text-base font-semibold mt-2 mb-1 text-gray-500 dark:text-gray-400 uppercase";
            case BlockType.Quote: return "border-l-4 border-gray-900 dark:border-gray-500 pl-4 py-1 my-2 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-r";
            case BlockType.Code: return "font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200";
            case BlockType.Callout: return "bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex gap-3 text-gray-900 dark:text-gray-100";
            case BlockType.Page: return "text-gray-900 dark:text-gray-100 font-medium underline decoration-gray-300 underline-offset-4 flex items-center gap-1";
            case BlockType.PageLink: return "text-purple-600 dark:text-purple-400 font-medium underline decoration-purple-300 underline-offset-4 flex items-center gap-1";
            case BlockType.Divider: return "hidden";
            default: return "text-base py-1 dark:text-gray-300";
        }
    };

    const isEmpty = !block.content || block.content === '<br>';
    const showPlaceholder = isFocused && isEmpty;

    return (
        <div
            className="group flex items-start relative -ml-12 pl-12"
        >
            {/* Handle Column */}
            <div
                className="absolute left-0 top-1.5 w-8 flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity select-none"
                contentEditable={false}
            >
                <div className="flex items-center gap-0.5 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer text-gray-400 dark:text-gray-500">
                    <button onClick={onAddNext} className="hover:text-gray-600 dark:hover:text-gray-300"><Plus size={16} /></button>
                </div>
            </div>

            {/* Content Column */}
            <div className={`flex-1 min-w-0 flex items-start relative ${block.type === BlockType.Callout ? 'bg-gray-50 dark:bg-gray-800 rounded-lg p-4' : ''}`}>

                {/* Prefix Icons */}
                {block.type === BlockType.Bullet && <span className="mr-2 text-xl leading-6 select-none dark:text-gray-300 mt-[-3px]">•</span>}
                {block.type === BlockType.Number && <span className="mr-2 text-base leading-7 font-medium text-gray-500 select-none dark:text-gray-400 w-5 text-right">{indexInList}.</span>}
                {block.type === BlockType.Todo && (
                    <div
                        className="mr-2 mt-1 cursor-pointer text-gray-400 hover:text-blue-500 select-none"
                        contentEditable={false}
                        onClick={() => onUpdate({ checked: !block.checked })}
                    >
                        {block.checked ? <CheckSquare size={18} className="text-blue-500" /> : <div className="w-[18px] h-[18px] border-2 border-current rounded" />}
                    </div>
                )}
                {block.type === BlockType.Toggle && (
                    <div
                        className="mr-2 mt-1 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 select-none transition-transform"
                        contentEditable={false}
                        onClick={() => onUpdate({ isOpen: !block.isOpen })}
                    >
                        {block.isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                )}
                {block.type === BlockType.Callout && (
                    <div className="mr-3 text-gray-800 dark:text-gray-200 mt-0.5 select-none" contentEditable={false}>
                        <Info size={20} />
                    </div>
                )}

                {block.type === BlockType.Page && (
                    <div
                        className="mr-2 text-gray-500 dark:text-gray-400 mt-0.5 select-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
                        contentEditable={false}
                        onClick={() => {
                            if (block.pageId && onNavigateToPage) {
                                onNavigateToPage(block.pageId);
                            }
                        }}
                    >
                        <FileText size={16} />
                    </div>
                )}

                {block.type === BlockType.PageLink && (
                    <div
                        className="mr-2 text-purple-500 dark:text-purple-400 mt-0.5 select-none cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded p-0.5 transition-colors"
                        contentEditable={false}
                        onClick={() => {
                            if (block.pageId && onNavigateToPage) {
                                onNavigateToPage(block.pageId);
                            }
                        }}
                    >
                        <Link size={16} />
                    </div>
                )}

                {block.type === BlockType.Divider ? (
                    <div className="w-full py-2 relative" onClick={onFocus}>
                        <hr className={`border-gray-200 dark:border-gray-700 ${isFocused ? 'border-blue-300 dark:border-blue-500' : ''}`} />
                        <div ref={contentRef} contentEditable className="absolute opacity-0 w-0 h-0 overflow-hidden" onKeyDown={handleKeyDown} onFocus={onFocus} />
                    </div>
                ) : (
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        className={`
                w-full outline-none
                ${getBlockStyles()}
                ${block.checked && block.type === BlockType.Todo ? 'line-through text-gray-400 dark:text-gray-600' : ''}
                ${showPlaceholder ? 'before:content-[attr(placeholder)] before:text-gray-300 dark:before:text-gray-600 before:absolute before:pointer-events-none' : ''}
                ${block.type === BlockType.Callout ? '!bg-transparent !p-0' : ''}
                ${block.type === BlockType.Page || block.type === BlockType.PageLink ? 'select-none' : ''}
            `}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onFocus={onFocus}
                        onBlur={() => { /* Save handled onInput */ }}
                        placeholder={block.type === BlockType.Text ? "Type '/' for commands" : `Heading ${block.type.replace('h', '')}`}
                    />
                )}
            </div>
        </div>
    );
};
