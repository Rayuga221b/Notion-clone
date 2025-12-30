import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BlockEditor from './components/Editor/BlockEditor';
import ExpenseView from './components/ExpenseTracker/ExpenseView';
import { ViewMode, Page, BlockType, Transaction } from './types';
import { Menu, MoreHorizontal, Moon, Sun, Monitor, Search, LogOut, Layout, Cloud, Check, CloudOff } from 'lucide-react';
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

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-24', merchant: 'Starbucks', amount: 5.45, category: 'Food & Drink', status: 'cleared' },
  { id: 't2', date: '2023-10-23', merchant: 'Uber', amount: 18.20, category: 'Transport', status: 'cleared' },
  { id: 't3', date: '2023-10-22', merchant: 'Netflix', amount: 15.99, category: 'Subscriptions', status: 'cleared' },
  { id: 't4', date: '2023-10-21', merchant: 'Whole Foods', amount: 84.32, category: 'Groceries', status: 'cleared' },
  { id: 't5', date: '2023-10-20', merchant: 'Shell', amount: 45.00, category: 'Transport', status: 'cleared' },
];

const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.Page);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading_data, setLoadingData] = useState(false);
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

  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setFontIndex(nextFontIndex);
        setNextFontIndex((prev) => (prev + 1) % fonts.length);
        setIsFading(false);
      }, 800); // Half of transition time
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

  // Smooth cursor follow
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

  const activePage = pages.find(p => p.id === activePageId);

  // History Helper
  const saveToHistory = (newPages: Page[] | ((prev: Page[]) => Page[])) => {
    setPages(prev => {
      const resolvedNewPages = typeof newPages === 'function' ? newPages(prev) : newPages;
      if (JSON.stringify(prev) !== JSON.stringify(resolvedNewPages)) {
        setUndoStack(u => [...u, prev].slice(-50)); // Keep last 50 states
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

  // Fetch data on login
  useEffect(() => {
    if (user) {
      const loadFromCache = () => {
        const cachedPages = localStorage.getItem(`pages_${user.uid}`);
        const cachedTransactions = localStorage.getItem(`transactions_${user.uid}`);
        const cachedProfile = localStorage.getItem(`user_profile_${user.uid}`);

        if (cachedPages) {
          const parsed = JSON.parse(cachedPages);
          setPages(parsed);
          if (parsed.length > 0) setActivePageId(parsed[0].id);
        }
        if (cachedTransactions) {
          setTransactions(JSON.parse(cachedTransactions));
        }
        if (cachedProfile) {
          const profile = JSON.parse(cachedProfile);
          if (profile.darkMode !== undefined) setDarkMode(profile.darkMode);
        }
      };

      const fetchData = async () => {
        if (!localStorage.getItem(`pages_${user.uid}`)) {
          setLoadingData(true);
        }
        try {
          const [fetchedPages, fetchedTransactions, fetchedProfile] = await Promise.all([
            persistenceService.fetchPages(user.uid),
            persistenceService.fetchTransactions(user.uid),
            persistenceService.fetchUserProfile(user.uid)
          ]);

          if (fetchedPages.length > 0) {
            setPages(fetchedPages);
            setActivePageId(prev => prev || fetchedPages[0].id);
          } else if (!localStorage.getItem(`pages_${user.uid}`)) {
            // Seed initial data for new users only if no cache exists
            setPages(INITIAL_PAGES);
            setActivePageId(INITIAL_PAGES[0].id);
          }
          setTransactions(fetchedTransactions.length > 0 ? fetchedTransactions : INITIAL_TRANSACTIONS);
          if (fetchedProfile && fetchedProfile.darkMode !== undefined) {
            setDarkMode(fetchedProfile.darkMode);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoadingData(false);
        }
      };

      loadFromCache();
      fetchData();
    }
  }, [user]);

  // Handle theme changes
  const toggleTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    if (user) {
      persistenceService.saveUserProfile(user.uid, { darkMode: isDark });
    } else {
      localStorage.setItem('darkMode_guest', JSON.stringify(isDark));
    }
  };

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Click outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Shortcuts (Cmd+K, Undo/Redo)
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
  }, [undoStack, redoStack, pages]); // Added dependencies for undo/redo handlers

  // Navigation Handlers
  const handlePageSelect = (id: string) => {
    setActivePageId(id);
    setCurrentView(ViewMode.Page);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleAddPage = (parentId: string | null = null, specificId?: string, shouldNavigate: boolean = true) => {
    const newPageId = specificId || crypto.randomUUID();
    const newPage: Page = {
      id: newPageId,
      title: 'Untitled',
      updatedAt: new Date(),
      blocks: [{ id: crypto.randomUUID(), type: BlockType.Heading1, content: 'Untitled' }],
      parentId,
      childIds: [],
      isFavorite: false,
      isExpanded: true
    };

    saveToHistory(currentPages => {
      let updatedPages = [...currentPages, newPage];

      // If adding a subpage, update the parent's childIds
      if (parentId) {
        updatedPages = updatedPages.map(p => {
          if (p.id === parentId) {
            return { ...p, isExpanded: true, childIds: [...p.childIds, newPageId] };
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

    if (user) {
      persistenceService.savePage(user.uid, newPage, 0); // Save immediately on create
    }
  };

  const handleDeletePage = (id: string) => {
    // Recursive delete helper
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

      // Remove from parent's childIds if applicable
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

      // Check if we need to navigate away (side-effect inside state update logic, but safe for check)
      if (activePageId && idsToDelete.includes(activePageId)) {
        setTimeout(() => {
          if (idsToDelete.includes(activePageId!)) {
            setActivePageId(null);
            setCurrentView(ViewMode.Dashboard);
          }
        }, 0);
      }

      return finalPages;
    });

    if (user) {
      persistenceService.deletePage(id);
    }
  };

  const handleToggleFavorite = (id: string) => {
    saveToHistory(currentPages => currentPages.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const handleToggleExpand = (id: string) => {
    saveToHistory(currentPages => currentPages.map(p => p.id === id ? { ...p, isExpanded: !p.isExpanded } : p));
  };

  const updateActivePageBlocks = (newBlocks: any[]) => {
    if (!activePageId) return;
    saveToHistory(currentPages => {
      // 1. Calculate the new title for the active page
      const firstH1 = newBlocks.find(b => b.type === BlockType.Heading1);
      // Use H1 content if available, otherwise default to 'Untitled' (never allow empty string title)
      const newTitle = (firstH1 && firstH1.content.trim()) ? firstH1.content : 'Untitled';

      return currentPages.map(p => {
        // Update the active page itself
        if (p.id === activePageId) {
          return { ...p, blocks: newBlocks, title: newTitle };
        }

        // Update any other page that might contain a Page block pointing to the active page
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

    // Save active page to Firestore with debounce
    if (user && activePageId) {
      const updatedPage = pages.find(p => p.id === activePageId);
      if (updatedPage) {
        const firstH1 = newBlocks.find(b => b.type === BlockType.Heading1);
        const newTitle = (firstH1 && firstH1.content.trim()) ? firstH1.content : 'Untitled';
        const pageToSave = { ...updatedPage, blocks: newBlocks, title: newTitle };

        setSaveStatus('unsaved');
        persistenceService.savePage(user.uid, pageToSave, 5000).then(() => {
          setSaveStatus('saved');
        });
      }
    }
  };

  const handleManualSave = async () => {
    if (!user || !activePageId || saveStatus === 'saving') return;

    const activePage = pages.find(p => p.id === activePageId);
    if (activePage) {
      setSaveStatus('saving');
      await persistenceService.savePage(user.uid, activePage, 0);
      setSaveStatus('saved');
    }
  };

  if (authLoading || loading_data) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#0C0C0C]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden selection:bg-white selection:text-black cursor-none">
        {/* Custom Dot Cursor */}
        <div
          className="fixed w-[38px] h-[38px] bg-white rounded-full pointer-events-none z-[100] mix-blend-difference"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        />

        {/* Mouse Blur Effect */}
        <div
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.05), transparent)`
          }}
        />

        <main className="z-10 flex flex-col items-center gap-8 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-2 relative h-24 md:h-32 justify-center">
            {/* Smooth Cross-fade Typography */}
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
          </div>
        </main>

        <footer className="absolute bottom-8 text-[10px] text-gray-700 tracking-[0.3em] uppercase">
          © {new Date().getFullYear()} COMPILE.
        </footer>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-white dark:bg-[#0C0C0C] text-[#37352F] dark:text-gray-100 transition-colors duration-200">

      {/* Sidebar (Desktop) */}
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
        />
      </div>

      {/* Main Content Area */}
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
                        <span className="opacity-70 hover:underline cursor-pointer" onClick={() => setCurrentView(ViewMode.Dashboard)}>Workspace</span>
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
              {currentView === ViewMode.Expenses && <span className="font-medium text-gray-900 dark:text-gray-100">Expenses</span>}
              {currentView === ViewMode.Dashboard && <span className="font-medium text-gray-900 dark:text-gray-100">Dashboard</span>}
            </div>

            {/* Save Status Indicator */}
            <div
              className="ml-4 flex items-center gap-1.5 transition-all duration-300"
            >
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

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          {currentView === ViewMode.Page && activePage ? (
            <div className="min-h-full pb-32">
              <div className="max-w-3xl mx-auto pt-12 px-6 sm:px-12">
                <BlockEditor
                  activePageId={activePage.id}
                  blocks={activePage.blocks}
                  pages={pages}
                  onChange={updateActivePageBlocks}
                  onCreatePage={() => {
                    // Creating a page from the editor always nests it under the current page
                    const newId = crypto.randomUUID();
                    handleAddPage(activePage.id, newId, true);
                    return newId;
                  }}
                  onNavigateToPage={handlePageSelect}
                  onNavigateUp={() => { }} // Placeholder or real logic
                  onNavigateDown={() => { }} // Placeholder or real logic
                  onDeletePage={handleDeletePage}
                />
              </div>
            </div>
          ) : currentView === ViewMode.Expenses ? (
            <ExpenseView
              transactions={transactions}
              onAddTransaction={(t) => {
                setTransactions([t, ...transactions]);
                if (user) persistenceService.saveTransaction(user.uid, t);
              }}
              onBulkAdd={(ts) => {
                setTransactions([...ts, ...transactions]);
                if (user) {
                  ts.forEach(t => persistenceService.saveTransaction(user.uid, t));
                }
              }}
            />
          ) : (
            <div className="p-12 max-w-4xl mx-auto text-center space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to COMPILE.</h1>
              <p className="text-gray-600 dark:text-gray-400">Select a page from the sidebar or navigate to your Expenses.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;