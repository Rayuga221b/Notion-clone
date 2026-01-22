import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, Page, Workspace } from '../types';
import { WorkspaceSelector } from './WorkspaceSelector';
import { InviteDialog } from './InviteDialog';
import {
  Layout,
  Search,
  Settings,
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Star,
  Folder,
  Pencil
} from 'lucide-react';

interface SidebarProps {
  pages: Page[];
  activePageId: string | null;
  onViewChange: (mode: ViewMode) => void;
  onPageSelect: (id: string) => void;
  onAddPage: () => void;
  onAddSubPage: (parentId: string) => void;
  onDeletePage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSearch: () => void;
  onAddFolder: () => void;
  onRenamePage: (id: string, newName: string) => void;
  currentView: ViewMode;
  // Workspace Props
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  onWorkspaceCreated: (ws: Workspace) => void;
  onJoinWorkspace: (ws: Workspace) => void;
  onWorkspaceRenamed: (id: string, name: string) => void;
  onWorkspaceDeleted: (id: string) => void;
  onWorkspaceLeft?: (id: string) => void;
  onWorkspaceSettingsChanged?: (id: string, settings: Partial<Workspace>) => void;
  userId: string;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  pages,
  activePageId,
  onViewChange,
  onPageSelect,
  onAddPage,
  onAddSubPage,
  onDeletePage,
  onToggleFavorite,
  onToggleExpand,
  currentView,
  onAddFolder,
  onRenamePage,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  onWorkspaceCreated,
  onJoinWorkspace,
  onWorkspaceRenamed,
  onWorkspaceDeleted,
  onWorkspaceLeft,
  onWorkspaceSettingsChanged,
  userId,
  userEmail
}) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const favorites = pages.filter(p => p.isFavorite);
  const rootPages = pages.filter(p => !p.parentId && p.type !== 'folder');
  const folders = pages.filter(p => p.type === 'folder' && !p.parentId);

  return (
    <div className="w-64 bg-[#F7F7F5] dark:bg-[#090909] border-r border-[#EBEBEA] dark:border-gray-800 h-screen flex flex-col text-[#37352F] dark:text-gray-300 transition-colors select-none">

      {/* Workspace Selector */}
      <WorkspaceSelector
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId || ''}
        onWorkspaceChange={onWorkspaceChange}
        onWorkspaceCreated={onWorkspaceCreated}
        onJoinRequest={() => setShowInviteDialog(true)}
        userId={userId}
        userEmail={userEmail}
        onWorkspaceRenamed={onWorkspaceRenamed}
        onWorkspaceDeleted={onWorkspaceDeleted}
        onWorkspaceLeft={onWorkspaceLeft}
        onWorkspaceSettingsChanged={onWorkspaceSettingsChanged}
      />

      <InviteDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onJoin={onJoinWorkspace}
        userId={userId}
      />

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

        {/* Databases Section Removed - Databases are now Pages */
        /*
        {databases.length > 0 && (
          <div className="px-3 mb-4">
            <SectionHeader title="Databases" />
            {databases.map(db => (
              <NavItem
                key={`db-${db.id}`}
                icon={<DbIcon size={16} />}
                label={db.title}
                isActive={currentView === ViewMode.Database && activeDatabaseId === db.id}
                onClick={() => onDatabaseSelect(db.id)}
              />
            ))}
          </div>
        )}
        */}

        {/* Folders Tree */}
        <div className="px-3 mb-4">
          <div className="group flex items-center justify-between text-xs font-semibold text-gray-500 mb-1 px-2">
            <span>FOLDERS</span>
            <button onClick={onAddFolder} className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-opacity">
              <Plus size={14} />
            </button>
          </div>

          {folders.map(folder => (
            <PageItem
              key={folder.id}
              page={folder}
              allPages={pages}
              activePageId={activePageId}
              onPageSelect={onPageSelect}
              onAddSubPage={onAddSubPage}
              onDeletePage={onDeletePage}
              onToggleFavorite={onToggleFavorite}
              onToggleExpand={onToggleExpand}
              onRenamePage={onRenamePage}
              depth={0}
            />
          ))}

          {folders.length === 0 && (
            <div className="px-2 text-xs text-gray-400 italic py-1">No folders.</div>
          )}
        </div>

        {/* Pages Tree */}
        <div className="px-3">
          <div className="group flex items-center justify-between text-xs font-semibold text-gray-500 mb-1 px-2">
            <span>PAGES</span>
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
              onRenamePage={onRenamePage}
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
  onRenamePage: (id: string, newName: string) => void;
  depth: number;
}> = ({ page, allPages, activePageId, onPageSelect, onAddSubPage, onDeletePage, onToggleFavorite, onToggleExpand, onRenamePage, depth }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const childPages = allPages.filter(p => p.parentId === page.id);
  const hasChildren = childPages.length > 0;
  const isActive = activePageId === page.id;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editName with page.title when page changes
  useEffect(() => {
    setEditName(page.title);
  }, [page.title]);

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setEditName(page.title);
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    const newName = editName.trim() || 'Untitled';
    onRenamePage(page.id, newName);
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditName(page.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

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

        <div className="flex-1 flex items-center gap-2 truncate cursor-pointer" onClick={() => !isEditing && onPageSelect(page.id)}>
          {page.type === 'folder' ? (
            <Folder size={14} className={isActive ? "text-gray-800 dark:text-gray-200" : "text-gray-400"} />
          ) : (
            <FileText size={14} className={isActive ? "text-gray-800 dark:text-gray-200" : "text-gray-400"} />
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveRename}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 text-sm outline-none min-w-0"
            />
          ) : (
            <span className="truncate">{page.title}</span>
          )}
        </div>

        {!isEditing && (
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
                  <button className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center gap-2" onClick={handleStartRename}>
                    <Pencil size={12} /> Rename
                  </button>
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
        )}
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
              onRenamePage={onRenamePage}
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