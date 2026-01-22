import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BlockEditor from './components/Editor/BlockEditor';
import Dashboard from './components/Dashboard/Dashboard';
import MobileRestriction from './components/MobileRestriction';

import { ViewMode, Page, BlockType, Workspace } from './types';
import { Menu, MoreHorizontal, Moon, Sun, Check, Cloud, LogOut, Monitor } from 'lucide-react';
import SearchDialog from './components/SearchDialog';
import { useAuth } from './components/AuthProvider';
import { persistenceService } from './services/persistenceService';

const INITIAL_PAGES: Page[] = [
  {
    id: '1',
    title: 'Project Phoenix',
    updatedAt: new Date(),
    blocks: [
      { id: 'b1', type: BlockType.Heading1, content: 'Project Phoenix Overview' },
      { id: 'b2', type: BlockType.Text, content: 'This is the main hub for our new initiative. The goal is to revolutionize personal productivity.' },
      { id: 'b3', type: BlockType.Heading2, content: 'Q4 Goals' },
      { id: 'b4', type: BlockType.Todo, content: 'Launch MVP by November', checked: false },
      { id: 'b5', type: BlockType.Todo, content: 'Secure initial funding', checked: true },
    ],
    parentId: null,
    childIds: [],
    isFavorite: false,
    isExpanded: true
  },
  {
    id: '2',
    title: 'Reading List',
    updatedAt: new Date(),
    blocks: [
      { id: 'r1', type: BlockType.Heading1, content: 'Books to Read' },
      { id: 'r2', type: BlockType.Todo, content: 'Atomic Habits', checked: true },
      { id: 'r3', type: BlockType.Todo, content: 'The Psychology of Money', checked: false },
    ],
    parentId: null,
    childIds: [],
    isFavorite: true,
    isExpanded: false
  }
];


const App: React.FC = () => {
  // Data State
  const [pages, setPages] = useState<Page[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  // UI State
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.Dashboard);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { user, login, logout, loading: authLoading } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  // Undo/Redo History State
  const [undoStack, setUndoStack] = useState<Page[][]>([]);
  const [redoStack, setRedoStack] = useState<Page[][]>([]);

  // Landing Page States
  const [fontIndex, setFontIndex] = useState(0);
  const [nextFontIndex, setNextFontIndex] = useState(1);
  const [isFading, setIsFading] = useState(false);
  const fonts = ['font-sans', 'font-serif', 'font-mono'];
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // ----------------------------------------------------------------------
  // EFFECTS: Auth & Boot
  // ----------------------------------------------------------------------

  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setFontIndex(nextFontIndex);
        setNextFontIndex((prev) => (prev + 1) % fonts.length);
        setIsFading(false);
      }, 800);
    }, 3000);
    return () => clearInterval(interval);
  }, [user, nextFontIndex]);

  useEffect(() => {
    if (user) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [user]);

  useEffect(() => {
    if (user) return;
    let requestRef: number;
    const updateCursor = () => {
      setCursorPos(prev => ({
        x: prev.x + (mousePos.x - prev.x) * 0.15,
        y: prev.y + (mousePos.y - prev.y) * 0.15,
      }));
      requestRef = requestAnimationFrame(updateCursor);
    };
    requestRef = requestAnimationFrame(updateCursor);
    return () => cancelAnimationFrame(requestRef);
  }, [user, mousePos]);

  // Main Boot Logic
  useEffect(() => {
    const bootWorkspace = async () => {
      if (!user) return;
      setLoadingData(true);

      try {
        // 1. Fetch User Profile
        let profile = await persistenceService.fetchUserProfile(user.uid);

        if (!profile) {
          // New User or missing profile -> Create default
          profile = await persistenceService.createUserProfile(user);
        }

        if (profile.darkMode !== undefined) setDarkMode(profile.darkMode);

        // 2. Fetch User Workspaces
        const userWorkspaces = await persistenceService.fetchUserWorkspaces(profile.workspaceIds || [], user.uid);

        let activeWs: Workspace | undefined;

        if (userWorkspaces.length === 0) {
          // Create Default Private Workspace
          activeWs = await persistenceService.createWorkspace(user.uid, "My Workspace", "private", true);
          setWorkspaces([activeWs]);
        } else {
          setWorkspaces(userWorkspaces);
          // Default to first or previously used (TODO: persist last used workspace ID in user profile)
          activeWs = userWorkspaces[0];
        }

        setCurrentWorkspace(activeWs);

        // 3. Load Pages for Active Workspace
        if (activeWs) {
          await loadWorkspaceData(activeWs.id);
        }

      } catch (error: any) {
        console.error("Boot Error:", error);
        setError(error.message || "Failed to load workspace.");
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
      bootWorkspace();
    }
  }, [user]);

  // ----------------------------------------------------------------------
  // EFFECTS: Mobile Check
  // ----------------------------------------------------------------------
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadWorkspaceData = async (workspaceId: string) => {
    setLoadingData(true);
    try {
      const fetchedPages = await persistenceService.fetchPages(workspaceId);
      setPages(fetchedPages);

      if (fetchedPages.length > 0) {
        // If we have pages, maybe select one? Or Dashboard.
        // setActivePageId(fetchedPages[0].id); 
      } else {
        // Empty workspace
        setPages([]);
        setActivePageId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  // ----------------------------------------------------------------------
  // HANDLERS: Workspace
  // ----------------------------------------------------------------------

  const handleWorkspaceChange = async (workspaceId: string, providedWs?: Workspace) => {
    const ws = providedWs || workspaces.find(w => w.id === workspaceId);
    if (!ws) {
      console.warn("Workspace not found for ID:", workspaceId);
      return;
    }

    setCurrentWorkspace(ws);
    setActivePageId(null);
    setCurrentView(ViewMode.Dashboard);
    await loadWorkspaceData(workspaceId);
  };

  const handleWorkspaceCreated = (newWs: Workspace) => {
    setWorkspaces(prev => [...prev, newWs]);
    handleWorkspaceChange(newWs.id);
  };

  const handleJoinWorkspace = (ws: Workspace) => {
    setWorkspaces(prev => {
      if (!prev.find(w => w.id === ws.id)) {
        return [...prev, ws];
      }
      return prev;
    });
    handleWorkspaceChange(ws.id, ws);
  };

  const handleWorkspaceRenamed = (id: string, name: string) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(prev => prev ? { ...prev, name } : null);
    }
  };

  const handleWorkspaceDeleted = (id: string) => {
    // 1. Remove from list
    const remaining = workspaces.filter(w => w.id !== id);
    setWorkspaces(remaining);

    // 2. If active was deleted, switch to another
    if (currentWorkspace?.id === id) {
      if (remaining.length > 0) {
        handleWorkspaceChange(remaining[0].id);
      } else {
        setCurrentWorkspace(null);
        setPages([]);
      }
    }
  };

  const handleWorkspaceLeft = (id: string) => {
    // Same logic as deleted from user's perspective
    handleWorkspaceDeleted(id);
  };

  const handleWorkspaceSettingsChanged = (id: string, settings: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...settings } : w));
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(prev => prev ? { ...prev, ...settings } : null);
    }
  };

  // ----------------------------------------------------------------------
  // HANDLERS: Pages (Scoped)
  // ----------------------------------------------------------------------

  const activePage = pages.find(p => p.id === activePageId);

  const saveToHistory = (newPages: Page[] | ((prev: Page[]) => Page[])) => {
    setPages(prev => {
      const resolvedNewPages = typeof newPages === 'function' ? newPages(prev) : newPages;
      if (JSON.stringify(prev) !== JSON.stringify(resolvedNewPages)) {
        setUndoStack(u => [...u, prev].slice(-50));
        setRedoStack([]);
      }
      return resolvedNewPages;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, -1));
    setRedoStack(r => [...r, pages]);
    setPages(previousState);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(u => [...u, pages]);
    setPages(nextState);
  };

  const handleAddPage = (parentId: string | null = null, specificId?: string, shouldNavigate: boolean = true) => {
    if (!currentWorkspace || !user) return;

    const newPageId = specificId || crypto.randomUUID();
    const newPage: Page = {
      id: newPageId,
      title: 'Untitled',
      updatedAt: new Date(),
      blocks: [{ id: crypto.randomUUID(), type: BlockType.Heading1, content: 'Untitled' }],
      parentId,
      childIds: [],
      isFavorite: false,
      isExpanded: true,
      type: 'page',
      workspaceId: currentWorkspace.id,
      ownerId: user.uid
    };

    saveToHistory(currentPages => {
      let updatedPages = [...currentPages, newPage];
      if (parentId) {
        updatedPages = updatedPages.map(p => {
          if (p.id === parentId) {
            const updatedParent = { ...p, isExpanded: true, childIds: [...p.childIds, newPageId] };
            if (p.type === 'folder') {
              persistenceService.savePage(currentWorkspace.id, updatedParent, 0);
            }
            return updatedParent;
          }
          return p;
        });
      }
      return updatedPages;
    });

    if (shouldNavigate) {
      setActivePageId(newPageId);
      setCurrentView(ViewMode.Page);
    }

    persistenceService.savePage(currentWorkspace.id, newPage, 0);
  };

  const handleCreateFolder = () => {
    if (!currentWorkspace || !user) return;

    const folderId = crypto.randomUUID();
    const newFolder: Page = {
      id: folderId,
      title: 'Untitled Folder',
      updatedAt: new Date(),
      blocks: [
        { id: crypto.randomUUID(), type: BlockType.Heading1, content: 'Untitled Folder' }
      ],
      parentId: null,
      childIds: [],
      isFavorite: false,
      isExpanded: true,
      type: 'folder',
      description: '',
      workspaceId: currentWorkspace.id,
      ownerId: user.uid
    };

    saveToHistory(currentPages => [...currentPages, newFolder]);
    setActivePageId(folderId);
    setCurrentView(ViewMode.Page);

    persistenceService.savePage(currentWorkspace.id, newFolder, 0);
  };

  const handlePageUpdate = (pageId: string, updates: Partial<Page>) => {
    if (!currentWorkspace || !user) return;

    saveToHistory(currentPages => currentPages.map(p =>
      p.id === pageId ? { ...p, ...updates } : p
    ));

    const page = pages.find(p => p.id === pageId);
    if (page) {
      persistenceService.savePage(currentWorkspace.id, { ...page, ...updates }, 1000);
    }
  };

  const handleRenamePage = (pageId: string, newName: string) => {
    if (!currentWorkspace || !user) return;

    const sanitizedName = newName.trim() || 'Untitled';

    saveToHistory(currentPages => {
      return currentPages.map(p => {
        if (p.id === pageId) {
          let updatedBlocks = [...p.blocks];
          const hasH1 = updatedBlocks.length > 0 && updatedBlocks[0].type === BlockType.Heading1;

          if (hasH1) {
            updatedBlocks[0] = { ...updatedBlocks[0], content: sanitizedName };
          } else {
            const newH1 = { id: crypto.randomUUID(), type: BlockType.Heading1, content: sanitizedName };
            updatedBlocks = [newH1, ...updatedBlocks];
          }
          return { ...p, title: sanitizedName, blocks: updatedBlocks };
        }

        // Update references
        const hasReference = p.blocks.some(b =>
          (b.type === BlockType.Page && b.pageId === pageId) ||
          (b.type === BlockType.PageLink && b.pageId === pageId)
        );
        if (hasReference) {
          return {
            ...p,
            blocks: p.blocks.map(b =>
              ((b.type === BlockType.Page && b.pageId === pageId) ||
                (b.type === BlockType.PageLink && b.pageId === pageId))
                ? { ...b, content: sanitizedName }
                : b
            )
          };
        }
        return p;
      });
    });

    const page = pages.find(p => p.id === pageId);
    if (page) {
      const updatedBlocks = page.blocks.map((block, idx) => {
        if (idx === 0 && block.type === BlockType.Heading1) {
          return { ...block, content: sanitizedName };
        }
        return block;
      });
      const updatedPage = { ...page, title: sanitizedName, blocks: updatedBlocks };
      persistenceService.savePage(currentWorkspace.id, updatedPage, 0);
    }
  };

  const handleDeletePage = (id: string) => {
    if (!currentWorkspace) return;

    const getIdsToDelete = (pageId: string, allPages: Page[]): string[] => {
      const page = allPages.find(p => p.id === pageId);
      if (!page) return [];
      let ids = [pageId];
      page.childIds.forEach(childId => {
        ids = [...ids, ...getIdsToDelete(childId, allPages)];
      });
      return ids;
    };

    saveToHistory(currentPages => {
      const idsToDelete = getIdsToDelete(id, currentPages);
      const updatedPages = currentPages.filter(p => !idsToDelete.includes(p.id));

      const pageToDelete = currentPages.find(p => p.id === id);
      let finalPages = updatedPages;
      if (pageToDelete && pageToDelete.parentId) {
        finalPages = updatedPages.map(p => {
          if (p.id === pageToDelete.parentId) {
            return { ...p, childIds: p.childIds.filter(cid => cid !== id) };
          }
          return p;
        });
      }

      if (activePageId && idsToDelete.includes(activePageId)) {
        setTimeout(() => {
          setActivePageId(null);
          setCurrentView(ViewMode.Dashboard);
        }, 0);
      }

      return finalPages;
    });

    persistenceService.deletePage(currentWorkspace.id, id);
  };

  const handleToggleFavorite = (id: string) => {
    // Note: Favorites could optionally be stored in UserProfile, 
    // but here they are properties of the Page, so they are workspace-specific implicitly.
    if (!currentWorkspace) return;
    saveToHistory(currentPages => currentPages.map(p => {
      if (p.id === id) {
        const updated = { ...p, isFavorite: !p.isFavorite };
        persistenceService.savePage(currentWorkspace.id, updated, 100);
        return updated;
      }
      return p;
    }));
  };

  const handleToggleExpand = (id: string) => {
    saveToHistory(currentPages => currentPages.map(p => p.id === id ? { ...p, isExpanded: !p.isExpanded } : p));
    // Optional: Persist expansion state if desired, but usually local session or ephemeral
  };

  const updateActivePageBlocks = (newBlocks: any[]) => {
    if (!activePageId || !currentWorkspace || !user) return;

    saveToHistory(currentPages => {
      const firstH1 = newBlocks.find(b => b.type === BlockType.Heading1);
      const rawTitle = (firstH1 && firstH1.content.trim()) ? firstH1.content : 'Untitled';
      const newTitle = rawTitle.replace(/<[^>]*>?/gm, '').trim() || 'Untitled';

      return currentPages.map(p => {
        if (p.id === activePageId) {
          return { ...p, blocks: newBlocks, title: newTitle };
        }
        const hasReference = p.blocks.some(b => b.type === BlockType.Page && b.pageId === activePageId || b.type === BlockType.PageLink && b.pageId === activePageId);
        if (hasReference) {
          return {
            ...p,
            blocks: p.blocks.map(b =>
              (b.type === BlockType.Page && b.pageId === activePageId || b.type === BlockType.PageLink && b.pageId === activePageId)
                ? { ...b, content: newTitle }
                : b
            )
          };
        }
        return p;
      });
    });

    const updatedPage = pages.find(p => p.id === activePageId);
    if (updatedPage) {
      const firstH1 = newBlocks.find(b => b.type === BlockType.Heading1);
      const rawTitle = (firstH1 && firstH1.content.trim()) ? firstH1.content : 'Untitled';
      const newTitle = rawTitle.replace(/<[^>]*>?/gm, '').trim() || 'Untitled';
      const pageToSave = { ...updatedPage, blocks: newBlocks, title: newTitle };

      setSaveStatus('unsaved');
      persistenceService.savePage(currentWorkspace.id, pageToSave, 5000).then(() => {
        setSaveStatus('saved');
      });
    }
  };

  const handleManualSave = async () => {
    if (!user || !activePageId || saveStatus === 'saving' || !currentWorkspace) return;

    const activePage = pages.find(p => p.id === activePageId);
    if (activePage) {
      setSaveStatus('saving');
      await persistenceService.savePage(currentWorkspace.id, activePage, 0);
      setSaveStatus('saved');
    }
  };

  // ----------------------------------------------------------------------
  // UI HANDLERS
  // ----------------------------------------------------------------------

  const toggleTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    if (user) {
      persistenceService.saveUserProfile(user.uid, { darkMode: isDark });
    } else {
      localStorage.setItem('darkMode_guest', JSON.stringify(isDark));
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'k') {
          e.preventDefault();
          setShowSearch(prev => !prev);
        } else if (e.key === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, pages]);

  const handlePageSelect = (id: string) => {
    saveToHistory(currentPages => currentPages.map(p => p.id === id ? { ...p, lastOpenedAt: Date.now() } : p));
    setActivePageId(id);
    setCurrentView(ViewMode.Page);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------

  if (authLoading || loadingData) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#0C0C0C]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden selection:bg-white selection:text-black cursor-none">
        <div
          className="fixed w-[38px] h-[38px] bg-white rounded-full pointer-events-none z-[100] mix-blend-difference"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        />
        <div
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.05), transparent)`
          }}
        />

        {error && (
          <div className="absolute top-4 w-full flex justify-center z-50">
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm backdrop-blur-md">
              {error} <button onClick={() => window.location.reload()} className="underline ml-2">Retry</button>
            </div>
          </div>
        )}

        <main className="z-10 flex flex-col items-center gap-8 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-2 relative h-24 md:h-32 justify-center">
            <h1 className={`absolute text-7xl md:text-9xl font-bold tracking-tighter transition-all duration-1000 ${fonts[fontIndex]} ${isFading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-[0.3px]'}`}>
              COMPILE.
            </h1>
            {!isFading && (
              <h1 className={`absolute text-7xl md:text-9xl font-bold tracking-tighter opacity-0 ${fonts[nextFontIndex]}`}>
                COMPILE.
              </h1>
            )}
            <p className="absolute -bottom-4 text-gray-500 font-light tracking-[0.2em] text-xs uppercase whitespace-nowrap">
              Thinking, compiled.
            </p>
          </div>

          <div className="mt-16 flex flex-col items-center gap-4">
            {isMobile ? (
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center animate-fade-in max-w-xs">
                <div className="p-3 bg-white/10 rounded-full mb-1">
                  <Monitor size={20} className="text-white/80" />
                </div>
                <p className="text-sm font-medium text-white/90 tracking-wide">Desktop Experience Only</p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Please open this URL on a desktop or laptop device to continue.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={login}
                  className="group relative flex items-center justify-center gap-3 px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all active:scale-95 cursor-none"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 pointer-events-none" alt="Google" />
                  Sign in to continue
                </button>
                <p className="text-[10px] text-gray-600 tracking-widest uppercase">
                  Secure authentication via Google
                </p>
              </>
            )}
          </div>
        </main>
        <footer className="absolute bottom-8 text-[10px] text-gray-700 tracking-[0.3em] uppercase">
          © {new Date().getFullYear()} COMPILE.
        </footer>
      </div>
    );
  }

  return (
    <>
      {isMobile && user && <MobileRestriction />}
      <div className={`flex w-full h-screen bg-white dark:bg-[#0C0C0C] text-[#37352F] dark:text-gray-100 transition-colors duration-200 ${isMobile && user ? 'filter blur-md pointer-events-none select-none overflow-hidden' : ''}`}>

        <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block shrink-0 h-full border-r border-gray-200 dark:border-gray-800`}>
          <Sidebar
            pages={pages}
            currentView={currentView}
            activePageId={activePageId}
            onViewChange={(view) => { setCurrentView(view); if (window.innerWidth < 768) setSidebarOpen(false); }}
            onPageSelect={handlePageSelect}
            onAddPage={() => handleAddPage(null)}
            onAddSubPage={(parentId) => handleAddPage(parentId)}
            onDeletePage={handleDeletePage}
            onToggleFavorite={handleToggleFavorite}
            onToggleExpand={handleToggleExpand}
            onSearch={() => setShowSearch(true)}
            onAddFolder={handleCreateFolder}
            onRenamePage={handleRenamePage}

            // Workspace Props
            workspaces={workspaces}
            activeWorkspaceId={currentWorkspace?.id || null}
            onWorkspaceChange={handleWorkspaceChange}
            onWorkspaceCreated={handleWorkspaceCreated}
            onJoinWorkspace={handleJoinWorkspace}
            onWorkspaceRenamed={handleWorkspaceRenamed}
            onWorkspaceDeleted={handleWorkspaceDeleted}
            onWorkspaceLeft={handleWorkspaceLeft}
            onWorkspaceSettingsChanged={handleWorkspaceSettingsChanged}
            userId={user.uid}
            userEmail={user.email || ''}
          />
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#0C0C0C]">
          {/* Topbar */}
          <div className="h-12 border-b border-transparent hover:border-gray-100 dark:hover:border-gray-800 flex items-center px-4 justify-between shrink-0 transition-colors z-20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400"
              >
                <Menu size={18} />
              </button>
              <div className="text-sm breadcrumbs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                {currentView === ViewMode.Page && activePage && (
                  <>
                    {(() => {
                      const breadcrumbs = [];
                      let curr: Page | undefined = activePage;
                      while (curr) {
                        breadcrumbs.unshift(curr);
                        if (curr.parentId) {
                          curr = pages.find(p => p.id === curr!.parentId);
                        } else {
                          curr = undefined;
                        }
                      }
                      return (
                        <>
                          <span className="opacity-70 hover:underline cursor-pointer" onClick={() => setCurrentView(ViewMode.Dashboard)}>
                            {currentWorkspace?.name || 'Workspace'}
                          </span>
                          <span className="opacity-40">/</span>
                          {breadcrumbs.map((page, index) => (
                            <React.Fragment key={page.id}>
                              <span
                                className={`truncate max-w-[150px] cursor-pointer hover:underline ${index === breadcrumbs.length - 1 ? 'font-medium text-gray-900 dark:text-gray-100' : ''}`}
                                onClick={() => handlePageSelect(page.id)}
                              >
                                {page.title}
                              </span>
                              {index < breadcrumbs.length - 1 && <span className="opacity-40">/</span>}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
                {currentView === ViewMode.Dashboard && <span className="font-medium text-gray-900 dark:text-gray-100">Dashboard</span>}
              </div>

              <div className="ml-4 flex items-center gap-1.5 transition-all duration-300">
                {saveStatus === 'unsaved' && (
                  <button
                    onClick={handleManualSave}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 animate-in fade-in slide-in-from-left-1"
                  >
                    <Cloud size={12} />
                    <span>Unsaved</span>
                  </button>
                )}
                {saveStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-500 opacity-0 hover:opacity-100 transition-opacity">
                    <Check size={12} />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Appearance</p>
                    <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                      <button
                        onClick={() => toggleTheme(false)}
                        className={`flex-1 flex justify-center p-1 rounded ${!darkMode ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                      >
                        <Sun size={14} />
                      </button>
                      <button
                        onClick={() => toggleTheme(true)}
                        className={`flex-1 flex justify-center p-1 rounded ${darkMode ? 'bg-white dark:bg-gray-600 shadow-sm text-white' : 'text-gray-500'}`}
                      >
                        <Moon size={14} />
                      </button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    Export Page
                  </button>
                  <button
                    onClick={() => { if (activePage) handleDeletePage(activePage.id); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 border-b border-gray-100 dark:border-gray-700"
                  >
                    Delete Page
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            {currentView === ViewMode.Page && activePage && currentWorkspace ? (
              <div className="min-h-full pb-32">
                <div className="max-w-3xl mx-auto pt-12 px-6 sm:px-12">
                  <BlockEditor
                    activePageId={activePageId}
                    activePage={activePage}
                    blocks={activePage.blocks}
                    pages={pages}
                    onChange={updateActivePageBlocks}
                    onUpdatePage={handlePageUpdate}
                    onCreatePage={() => handleAddPage(activePageId)}
                    onNavigateToPage={handlePageSelect}
                    onDeletePage={handleDeletePage}
                  />
                </div>
              </div>
            ) : currentView === ViewMode.Dashboard ? (
              <Dashboard
                pages={pages}
                onPageSelect={handlePageSelect}
                onAddPage={(parentId) => handleAddPage(parentId)}
                onAddFolder={handleCreateFolder}
              />
            ) : null}
          </main>
        </div>
        <SearchDialog
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          pages={pages}
          onSelect={handlePageSelect}
        />
      </div>
    </>
  );
};

export default App;