import { LayoutDashboard, FileText, MessageSquare, Settings, HelpCircle, LogOut, Users, Upload, Archive, BookOpen, Lightbulb, Bot, ClipboardList, History, CalendarClock } from 'lucide-react';
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
  const items = userRole === 'admin' 
    ? [
        { icon: LayoutDashboard, label: 'לוח בקרה', href: '#', active: activeTab === 'לוח בקרה' },
        { icon: Users, label: 'לקוחות', href: '#', active: activeTab === 'לקוחות' },
        { icon: FileText, label: 'מסמכים', href: '#', active: activeTab === 'מסמכים' },
        { icon: BookOpen, label: 'דוחות שנתיים', href: '#', active: activeTab === 'דוחות שנתיים' },
        { icon: Bot, label: 'אוטומציות וסוכנים', href: '#', active: activeTab === 'אוטומציות וסוכנים' },
        { icon: Lightbulb, label: 'ניהול ידע', href: '#', active: activeTab === 'ניהול ידע' },
      { icon: ClipboardList, label: 'משימות צוות', href: '#', active: activeTab === 'משימות צוות' },
        { icon: CalendarClock, label: 'מעקב דדליינים', href: '#', active: activeTab === 'מעקב דדליינים' },
        { icon: History, label: 'יומן פעילות', href: '#', active: activeTab === 'יומן פעילות' },
        { icon: MessageSquare, label: 'פניות וצ\'אט', href: '#', active: activeTab === 'פניות וצ\'אט' },
        { icon: Settings, label: 'הגדרות', href: '#', active: activeTab === 'הגדרות' },
      ]
    : navItems.map(item => ({ ...item, active: item.label === activeTab }));

  return (
    <aside className="hidden w-64 flex-col border-l border-border/50 bg-background/95 backdrop-blur-xl lg:flex shadow-sm z-10">
      <div className="flex h-16 items-center px-8 border-b border-border/50">
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-primary/70 tracking-tight font-heading">
          Mas4U
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1.5 px-3">
          {items.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? 'secondary' : 'ghost'}
              onClick={() => onTabChange?.(item.label)}
              className={cn(
                'w-full justify-start gap-3 px-4 py-6 text-sm font-medium transition-all duration-300 rounded-xl',
                item.active 
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              <item.icon className={cn("h-5 w-5", item.active ? "text-primary" : "text-muted-foreground/70")} />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t border-border/50 p-4 space-y-1.5">
        <Button variant="ghost" className="w-full justify-start gap-3 px-4 text-sm font-medium rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground">
          <HelpCircle className="h-5 w-5 text-muted-foreground/70" />
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
