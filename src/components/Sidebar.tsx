import { LayoutDashboard, FileText, MessageSquare, Settings, HelpCircle, LogOut, Users, Upload, Archive, BookOpen, Lightbulb, ClipboardList, History, CalendarClock, LayoutGrid, TrendingUp, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'דאשבורד', href: '#', active: true },
  { icon: Upload, label: 'העלאת מסמכים', href: '#', active: false },
  { icon: FileText, label: 'המסמכים שלי', href: '#', active: false },
  { icon: Archive, label: 'ארכיון מסמכים', href: '#', active: false },
  { icon: BookOpen, label: 'מרכז ידע וזכויות', href: '#', active: false },
  { icon: Users, label: 'קהילה', href: '#', active: false },
  { icon: MessageSquare, label: 'תמיכה וצ\'אט', href: '#', active: false },
  { icon: Settings, label: 'הגדרות', href: '#', active: false },
];

export function Sidebar({ onLogout, userRole, activeTab, onTabChange }: { 
  onLogout: () => void; 
  userRole?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const adminGroups = [
    { title: 'ראשי', items: [
      { icon: LayoutDashboard, label: 'לוח בקרה' },
      { icon: Users, label: 'לקוחות' },
      { icon: LayoutGrid, label: 'תמונת מצב תיקים' },
      { icon: ClipboardList, label: 'משימות צוות' },
    ] },
    { title: 'מסמכים ודוחות', items: [
      { icon: FileText, label: 'מסמכים' },
      { icon: BookOpen, label: 'דוחות שנתיים' },
      { icon: Database, label: 'טבלאות' },
    ] },
    { title: 'בקרה', items: [
      { icon: CalendarClock, label: 'מעקב דדליינים' },
      { icon: History, label: 'יומן פעילות' },
      { icon: TrendingUp, label: 'סיכום שבועי' },
    ] },
    { title: 'כלים', items: [
      { icon: MessageSquare, label: 'פניות וצ\'אט' },
      { icon: Lightbulb, label: 'ניהול ידע' },
      { icon: Settings, label: 'הגדרות' },
    ] },
  ];
  const groups = userRole === 'admin'
    ? adminGroups.map(g => ({ title: g.title, items: g.items.map(i => ({ ...i, active: activeTab === i.label })) }))
    : [{ title: '', items: navItems.map(item => ({ ...item, active: item.label === activeTab })) }];

  return (
    <aside className="hidden w-64 flex-col border-l border-border/50 bg-background/95 backdrop-blur-xl lg:flex shadow-sm z-10">
      <div className="flex h-16 items-center px-8 border-b border-border/50">
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-primary/70 tracking-tight font-heading">
          Mas4U
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-4 px-3">
          {groups.map((group) => (
            <div key={group.title || 'all'} className="space-y-1.5">
              {group.title && (
                <div className="px-4 pb-1 text-[11px] font-bold tracking-wider text-muted-foreground">{group.title}</div>
              )}
              {group.items.map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? 'secondary' : 'ghost'}
                  onClick={() => onTabChange?.(item.label)}
                  className={cn(
                    'w-full justify-start gap-3 px-4 py-5 text-sm font-medium transition-all duration-300 rounded-xl',
                    item.active
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  <item.icon className={cn("h-5 w-5", item.active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Button>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t border-border/50 p-4 space-y-1.5">
        <Button variant="ghost" className="w-full justify-start gap-3 px-4 text-sm font-medium rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          עזרה ותמיכה
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 px-4 text-sm font-medium rounded-xl text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5 opacity-80" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
