import { Bell, Search, User as UserIcon, Menu, LayoutDashboard, FileText, MessageSquare, Settings, LogOut, BookOpen, CheckCircle2, AlertCircle, Info, File } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/src/services/api';
import { onDBChange, getDB } from '@/src/lib/mockData';
import { Notification, Document, KnowledgeArticle, User } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'דאשבורד', href: '#', active: true },
  { icon: FileText, label: 'הדוחות שלי', href: '#', active: false },
  { icon: BookOpen, label: 'מרכז ידע וזכויות', href: '#', active: false },
  { icon: MessageSquare, label: 'תמיכה וצ\'אט', href: '#', active: false },
  { icon: Settings, label: 'הגדרות', href: '#', active: false },
];

// Admin/staff navigation for the mobile menu (mirrors the desktop Sidebar).
const adminNavItems = [
  { icon: LayoutDashboard, label: 'לוח בקרה' },
  { icon: UserIcon, label: 'לקוחות' },
  { icon: LayoutDashboard, label: 'תמונת מצב תיקים' },
  { icon: FileText, label: 'טבלאות' },
  { icon: FileText, label: 'מסמכים' },
  { icon: BookOpen, label: 'דוחות שנתיים' },
  { icon: FileText, label: 'ניהול ידע' },
  { icon: FileText, label: 'משימות צוות' },
  { icon: FileText, label: 'מעקב דדליינים' },
  { icon: FileText, label: 'יומן פעילות' },
  { icon: FileText, label: 'סיכום שבועי' },
  { icon: MessageSquare, label: "פניות וצ'אט" },
  { icon: Settings, label: 'הגדרות' },
];

export function Header({ user, onLogout, onTabChange }: { user: any; onLogout: () => void; onTabChange?: (tab: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{docs: Document[], articles: KnowledgeArticle[], clients: User[]}>({ docs: [], articles: [], clients: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNav = user?.role === 'admin' ? adminNavItems : navItems;
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = () => api.getNotifications(user.id).then(setNotifications);
    load();
    // Refresh live when the shared database changes (e.g. a task you assigned was completed).
    const off = onDBChange(load);
    return off;
  }, [user?.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const fetchResults = async () => {
        const [docs, knowledge] = await Promise.all([
          api.getDocuments(user?.id),
          api.getKnowledgeBase()
        ]);
        
        const q = searchQuery.toLowerCase();
        // Admins can search all clients by name / email / ID number / client number.
        let clients: User[] = [];
        if (user?.role === 'admin') {
          const all = getDB().users || [];
          clients = all.filter((u: User) =>
            u.role === 'client' && (
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              (u.idNumber || '').includes(searchQuery) ||
              (u.clientNumber || '').includes(searchQuery)
            )
          ).slice(0, 6);
        }
        setIsSearchOpen(true);
        setSearchResults({
          docs: docs.filter((d: Document) => d.name.toLowerCase().includes(q)),
          articles: knowledge.filter((a: KnowledgeArticle) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)),
          clients,
        });
      };
      fetchResults();
    } else {
      setIsSearchOpen(false);
    }
  }, [searchQuery, user?.id]);

  const handleSearchResultClick = (tab: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    onTabChange?.(tab);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-muted/80">
                <Menu className="h-5 w-5" />
                <span className="sr-only">תפריט</span>
              </Button>
            }
          />
          <SheetContent side="right" className="w-[300px] p-0 border-border/50 bg-background/95 backdrop-blur-xl" dir="rtl">
            <SheetHeader className="border-b border-border/50 p-6 text-right">
              <SheetTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-primary/70 tracking-tight font-heading">
                Mas4U
              </SheetTitle>
            </SheetHeader>
            <nav className="space-y-1.5 p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {mobileNav.map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start gap-3 px-4 py-6 text-sm font-medium rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  onClick={() => { onTabChange?.(item.label); setMenuOpen(false); }}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground/70" />
                  {item.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-6 text-sm text-destructive font-medium rounded-xl hover:bg-destructive/10"
                onClick={() => { setMenuOpen(false); onLogout(); }}
              >
                <LogOut className="h-5 w-5 opacity-80" />
                התנתקות
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="relative w-full max-w-md hidden md:block" ref={searchRef}>
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="חיפוש דוחות או מסמכים..."
            className="pr-10 bg-muted/30 border-transparent focus-visible:ring-primary/20 rounded-full h-10 transition-colors hover:bg-muted/50 focus:bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.length > 1) setIsSearchOpen(true) }}
          />

          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto"
              >
                {searchResults.docs.length === 0 && searchResults.articles.length === 0 && searchResults.clients.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    לא נמצאו תוצאות ל"{searchQuery}"
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.clients.length > 0 && (
                      <div className="px-3 pb-2">
                        <h4 className="text-xs font-bold text-muted-foreground mb-2 px-2">לקוחות</h4>
                        {searchResults.clients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSearchResultClick('לקוחות')}
                            className="w-full text-right flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            <UserIcon className="h-4 w-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{client.name}{client.clientNumber ? ` · #${client.clientNumber}` : ''}</span>
                              <span className="text-xs text-muted-foreground">{client.idNumber ? `ת"ז ${client.idNumber}` : client.email}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.clients.length > 0 && (searchResults.docs.length > 0 || searchResults.articles.length > 0) && <DropdownMenuSeparator />}

                    {searchResults.docs.length > 0 && (
                      <div className="px-3 pb-2">
                        <h4 className="text-xs font-bold text-muted-foreground mb-2 px-2">מסמכים</h4>
                        {searchResults.docs.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => handleSearchResultClick('המסמכים שלי')}
                            className="w-full text-right flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            <File className="h-4 w-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{doc.name}</span>
                              <span className="text-xs text-muted-foreground">{doc.date}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.docs.length > 0 && searchResults.articles.length > 0 && <DropdownMenuSeparator />}
                    
                    {searchResults.articles.length > 0 && (
                      <div className="px-3 pt-2">
                        <h4 className="text-xs font-bold text-muted-foreground mb-2 px-2">מרכז ידע</h4>
                        {searchResults.articles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => handleSearchResultClick('מרכז ידע וזכויות')}
                            className="w-full text-right flex flex-col p-2 rounded-lg hover:bg-primary/5 transition-colors gap-1"
                          >
                            <span className="text-sm font-medium text-primary">{article.title}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{article.excerpt}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80" dir="rtl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-bold text-lg flex items-center justify-between">
                התראות
                {unreadCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground cursor-pointer hover:underline" onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  }}>
                    סמן הכל כנקרא
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    אין התראות חדשות
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 p-1">
                    {notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                          {notif.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {notif.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          {notif.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {notif.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                          <span className={`font-semibold text-sm ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </span>
                          {!notif.isRead && <span className="mr-auto h-2 w-2 rounded-full bg-primary"></span>}
                        </div>
                        <span className="text-xs text-muted-foreground pr-6 line-clamp-2">{notif.message}</span>
                        <span className="text-[10px] text-muted-foreground/70 pr-6 mt-1">
                          {new Date(notif.timestamp).toLocaleString('he-IL')}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.email}/200`} alt={user?.name} />
                  <AvatarFallback>{user?.name?.substring(0, 2)}</AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56" dir="rtl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange?.('הגדרות')}>פרופיל</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange?.('הגדרות')}>הגדרות</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onLogout}>התנתקות</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
