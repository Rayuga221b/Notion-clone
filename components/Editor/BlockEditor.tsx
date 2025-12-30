import React, { useState, useRef, useEffect } from 'react';
import { Block, BlockType, Page } from '../../types';
import { suggestNextBlock } from '../../services/geminiService';
import { BLOCK_TYPES } from './constants';
import { SlashMenu } from './UI/SlashMenu';
import { FloatingToolbar } from './UI/FloatingToolbar';
import { EditableBlock } from './BlockComponents/EditableBlock';
import { PageSelector } from './UI/PageSelector';
import { AlertTriangle, Info } from 'lucide-react';

const MAX_BLOCKS = 1800;
const WARN_BLOCKS = 1500;

interface BlockEditorProps {
  blocks: Block[];
  pages: Page[]; // Added pages for linking
  onChange: (blocks: Block[]) => void;
  onCreatePage: () => string; // Returns new page ID
  onNavigateToPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, pages, onChange, onCreatePage, onNavigateToPage, onDeletePage }) => {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Slash Menu State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuFilter, setSlashMenuFilter] = useState('');
  const [slashMenuIndex, setSlashMenuIndex] = useState<number>(-1);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // Page Selector State
  const [pageSelectorOpen, setPageSelectorOpen] = useState(false);
  const [pageSelectorPosition, setPageSelectorPosition] = useState({ top: 0, left: 0 });
  const [pageSelectorIndex, setPageSelectorIndex] = useState<number>(-1);

  // Floating Toolbar State
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number, left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Update specific block
  const updateBlock = (id: string, updates: Partial<Block>) => {
    const oldBlock = blocks.find(b => b.id === id);
    if (oldBlock?.type === BlockType.Page && updates.type && updates.type !== BlockType.Page) {
      // If converting away from a Page block, also delete the actual page
      if (oldBlock.pageId) {
        onDeletePage(oldBlock.pageId);
      }
    }
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    onChange(newBlocks);
  };

  // Add new block
  const addBlock = (index: number, type: BlockType = BlockType.Text) => {
    if (blocks.length >= MAX_BLOCKS) {
      alert(`Page limit reached (${MAX_BLOCKS} blocks). Please split this into multiple pages to ensure performance and reliability.`);
      return;
    }
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      content: '',
      checked: false
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks);
    setFocusedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const index = blocks.findIndex(b => b.id === id);
    const blockToDelete = blocks[index];

    // If deleting a page block, also delete the actual page
    if (blockToDelete.type === BlockType.Page && blockToDelete.pageId) {
      onDeletePage(blockToDelete.pageId);
    }

    const newBlocks = blocks.filter(b => b.id !== id);
    onChange(newBlocks);
    if (index > 0) {
      setFocusedBlockId(newBlocks[index - 1].id);
    }
  };

  // Trigger slash menu
  const openSlashMenu = (index: number, rect: DOMRect) => {
    setSlashMenuIndex(index);
    setSlashMenuPosition({ top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
    setSlashMenuOpen(true);
    setSlashMenuFilter('');
  };

  const closeSlashMenu = () => {
    setSlashMenuOpen(false);
    setSlashMenuIndex(-1);
  };

  const closePageSelector = () => {
    setPageSelectorOpen(false);
    setPageSelectorIndex(-1);
  };

  const handleSlashSelect = (type: BlockType) => {
    if (slashMenuIndex === -1) return;
    const block = blocks[slashMenuIndex];
    let newContent = block.content;
    if (newContent.endsWith('/')) newContent = newContent.slice(0, -1);

    if (type === BlockType.Page) {
      const newPageId = onCreatePage();
      updateBlock(block.id, { type, content: 'Untitled', pageId: newPageId });
      closeSlashMenu();
      setFocusedBlockId(block.id);
    } else if (type === BlockType.PageLink) {
      setPageSelectorIndex(slashMenuIndex);
      setPageSelectorPosition(slashMenuPosition);
      setPageSelectorOpen(true);
      closeSlashMenu();
    } else {
      updateBlock(block.id, { type, content: newContent });
      closeSlashMenu();
      setFocusedBlockId(block.id);
    }
  };

  const handlePageSelect = (pageId: string, title: string) => {
    if (pageSelectorIndex === -1) return;
    const block = blocks[pageSelectorIndex];
    updateBlock(block.id, {
      type: BlockType.PageLink,
      content: title,
      pageId
    });
    closePageSelector();
    setFocusedBlockId(block.id);
  };

  // Selection Change Handler
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setToolbarPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
        setToolbarPosition({
          top: rect.top - 40,
          left: rect.left
        });
      } else {
        if (!editorRef.current?.contains(selection.anchorNode)) {
          setToolbarPosition(null);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);


  return (
    <div
      ref={editorRef}
      className="w-full max-w-4xl mx-auto py-8 relative min-h-[50vh] cursor-text"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // If clicking empty space at bottom, focus last block or add new one
          if (blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            setFocusedBlockId(lastBlock.id);
          } else {
            addBlock(-1);
          }
        }
      }}
    >

      {/* Floating Toolbar */}
      {toolbarPosition && (
        <FloatingToolbar position={toolbarPosition} />
      )}

      {/* Block Count Warning */}
      {blocks.length >= WARN_BLOCKS && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${blocks.length >= MAX_BLOCKS
            ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-300'
            : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-300'
          }`}>
          {blocks.length >= MAX_BLOCKS ? <AlertTriangle size={18} /> : <Info size={18} />}
          <div className="text-sm">
            <p className="font-semibold">
              {blocks.length >= MAX_BLOCKS ? 'Maximum limit reached' : 'Approaching page limit'}
            </p>
            <p className="opacity-90">
              {blocks.length >= MAX_BLOCKS
                ? `This page has reached the maximum capacity of ${MAX_BLOCKS} blocks.`
                : `This page is getting large (${blocks.length} blocks). We recommend splitting it to keep things fast.`}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {(() => {
          let numberingCounter = 0;
          return blocks.map((block, index) => {
            if (block.type === BlockType.Number) {
              numberingCounter++;
            } else {
              numberingCounter = 0;
            }

            return (
              <EditableBlock
                key={block.id}
                block={block}
                indexInList={block.type === BlockType.Number ? numberingCounter : undefined}
                isFocused={focusedBlockId === block.id}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                onFocus={() => setFocusedBlockId(block.id)}
                onAddNext={() => addBlock(index,
                  block.type === BlockType.Bullet ? BlockType.Bullet :
                    block.type === BlockType.Number ? BlockType.Number :
                      block.type === BlockType.Todo ? BlockType.Todo :
                        block.type === BlockType.Toggle ? BlockType.Toggle :
                          BlockType.Text
                )}
                onDelete={() => removeBlock(block.id)}
                onOpenMenu={(rect) => openSlashMenu(index, rect)}
                slashMenuOpen={slashMenuOpen && slashMenuIndex === index}
                onSlashFilterChange={setSlashMenuFilter}
                onNavigateUp={() => index > 0 && setFocusedBlockId(blocks[index - 1].id)}
                onNavigateDown={() => index < blocks.length - 1 && setFocusedBlockId(blocks[index + 1].id)}
                onRequestSuggestion={() => {
                  if (!loadingSuggestion) {
                    setLoadingSuggestion(true);
                    suggestNextBlock(blocks.map(b => b.content).join('\n')).then(text => {
                      updateBlock(block.id, { content: block.content + " " + text });
                      setLoadingSuggestion(false);
                    });
                  }
                }}
                onNavigateToPage={onNavigateToPage}
              />
            );
          });
        })()}
      </div>

      {slashMenuOpen && (
        <SlashMenu
          position={slashMenuPosition}
          filter={slashMenuFilter}
          onSelect={handleSlashSelect}
          onClose={closeSlashMenu}
        />
      )}

      {pageSelectorOpen && (
        <PageSelector
          pages={pages}
          position={pageSelectorPosition}
          onSelect={handlePageSelect}
          onClose={closePageSelector}
        />
      )}

      {loadingSuggestion && (
        <div className="text-xs text-purple-500 animate-pulse mt-4 flex items-center gap-1 justify-center">
          <span className="i-lucide-sparkles w-3 h-3" /> AI is writing...
        </div>
      )}
    </div>
  );
};

export default BlockEditor;