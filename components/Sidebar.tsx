import React, { useState } from 'react';
import { ViewMode, Page } from '../types';
import {
  Layout,
  Search,
  CreditCard,
  Settings,
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Star
} from 'lucide-react';

interface SidebarProps {
  pages: Page[];
  currentView: ViewMode;
  activePageId: string | null;
  onViewChange: (mode: ViewMode) => void;
  onPageSelect: (id: string) => void;
  onAddPage: () => void;
  onAddSubPage: (parentId: string) => void;
  onDeletePage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSearch: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  pages,
  currentView,
  activePageId,
  onViewChange,
  onPageSelect,
  onAddPage,
  onAddSubPage,
  onDeletePage,
  onToggleFavorite,
  onToggleExpand,
  onSearch
}) => {
  const favorites = pages.filter(p => p.isFavorite);
  const rootPages = pages.filter(p => !p.parentId);

  return (
    <div className="w-64 bg-[#F7F7F5] dark:bg-black border-r border-[#EBEBEA] dark:border-gray-800 h-screen flex flex-col text-[#37352F] dark:text-gray-300 transition-colors select-none">

      {/* User / Workspace Switcher */}
      <div className="p-4 flex items-center gap-2 hover:bg-[#EFEFED] dark:hover:bg-gray-800 cursor-pointer transition-colors m-2 rounded-md">
        <div className="w-5 h-5 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">C</div>
        <span className="font-medium text-sm truncate dark:text-gray-200">My Workspace</span>
        <div className="ml-auto text-xs border border-gray-300 dark:border-gray-600 rounded px-1 text-gray-500 dark:text-gray-400">Free</div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-4">
          {/* Global Views */}
          <NavItem
            icon={<Layout size={16} />}
            label="Dashboard"
            isActive={currentView === ViewMode.Dashboard}
            onClick={() => onViewChange(ViewMode.Dashboard)}
          />
          <NavItem
            icon={<CreditCard size={16} />}
            label="Expenses"
            isActive={currentView === ViewMode.Expenses}
            onClick={() => onViewChange(ViewMode.Expenses)}
          />
          <NavItem
            icon={<Settings size={16} />}
            label="Settings"
            isActive={currentView === ViewMode.Settings}
            onClick={() => onViewChange(ViewMode.Settings)}
          />
        </div>

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="px-3 mb-4">
            <SectionHeader title="Favorites" />
            {favorites.map(page => (
              <NavItem
                key={`fav-${page.id}`}
                icon={<FileText size={16} />}
                label={page.title}
                isActive={currentView === ViewMode.Page && activePageId === page.id}
                onClick={() => onPageSelect(page.id)}
              />
            ))}
          </div>
        )}

        {/* Pages Tree */}
        <div className="px-3">
          <div className="group flex items-center justify-between text-xs font-semibold text-gray-500 mb-1 px-2">
            <span>PRIVATE</span>
            <button onClick={onAddPage} className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-opacity">
              <Plus size={14} />
            </button>
          </div>

          {rootPages.map(page => (
            <PageItem
              key={page.id}
              page={page}
              allPages={pages}
              activePageId={activePageId}
              onPageSelect={onPageSelect}
              onAddSubPage={onAddSubPage}
              onDeletePage={onDeletePage}
              onToggleFavorite={onToggleFavorite}
              onToggleExpand={onToggleExpand}
              depth={0}
            />
          ))}

          {rootPages.length === 0 && (
            <div className="px-2 text-xs text-gray-400 italic py-2">No pages. Click + to add one.</div>
          )}

          <button
            onClick={onAddPage}
            className="w-full text-left flex items-center gap-2 px-2 py-1 text-gray-500 hover:bg-[#EFEFED] dark:hover:bg-gray-800 rounded-md mt-1 transition-colors group"
          >
            <div className="w-5 h-5 flex items-center justify-center rounded text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
              <Plus size={14} />
            </div>
            <span className="text-sm">Add a page</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Recursive Page Item Component
const PageItem: React.FC<{
  page: Page;
  allPages: Page[];
  activePageId: string | null;
  onPageSelect: (id: string) => void;
  onAddSubPage: (parentId: string) => void;
  onDeletePage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleExpand: (id: string) => void;
  depth: number;
}> = ({ page, allPages, activePageId, onPageSelect, onAddSubPage, onDeletePage, onToggleFavorite, onToggleExpand, depth }) => {
  const [showMenu, setShowMenu] = useState(false);
  const childPages = allPages.filter(p => p.parentId === page.id);
  const hasChildren = childPages.length > 0;
  const isActive = activePageId === page.id;

  return (
    <>
      <div
        className={`group flex items-center gap-1 px-2 py-1 min-h-[28px] rounded-md text-sm transition-colors mb-0.5
          ${isActive ? 'bg-[#EFEFED] dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-[#EFEFED] dark:hover:bg-gray-800'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div
          className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer mr-0.5 text-gray-400"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(page.id); }}
        >
          {hasChildren ? (
            page.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : <div className="w-3 h-3" />}
        </div>

        <div className="flex-1 flex items-center gap-2 truncate cursor-pointer" onClick={() => onPageSelect(page.id)}>
          <FileText size={14} className={isActive ? "text-gray-800 dark:text-gray-200" : "text-gray-400"} />
          <span className="truncate">{page.title}</span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onAddSubPage(page.id); }} className="hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5 rounded text-gray-500">
            <Plus size={12} />
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5 rounded text-gray-500">
              <MoreHorizontal size={12} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded z-50 py-1 flex flex-col text-xs" onMouseLeave={() => setShowMenu(false)}>
                <button className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onToggleFavorite(page.id); }}>
                  <Star size={12} /> {page.isFavorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-red-600 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDeletePage(page.id); }}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {page.isExpanded && hasChildren && (
        <div>
          {childPages.map(child => (
            <PageItem
              key={child.id}
              page={child}
              allPages={allPages}
              activePageId={activePageId}
              onPageSelect={onPageSelect}
              onAddSubPage={onAddSubPage}
              onDeletePage={onDeletePage}
              onToggleFavorite={onToggleFavorite}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-xs font-semibold text-gray-500 mb-1 px-2 mt-4">{title}</div>
);

const NavItem: React.FC<{
  icon: React.ReactNode,
  label: string,
  isActive: boolean,
  onClick: () => void
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors mb-0.5
      ${isActive ? 'bg-[#EFEFED] dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-[#EFEFED] dark:hover:bg-gray-800'}`}
  >
    <span className={`${isActive ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

export default Sidebar;