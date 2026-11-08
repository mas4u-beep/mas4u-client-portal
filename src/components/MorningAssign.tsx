import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sun, Send, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DB, TeamTask, Notification } from '@/src/types';
import { logActivity } from '@/src/lib/mockData';
import { toast } from 'sonner';

interface Props {
  db: DB;
  setDb: (db: DB) => void;
  saveDB: (db: DB) => void;
  myName: string;
}

const PRIORITIES: { key: 'high' | 'medium' | 'low'; label: string; activeCls: string }[] = [
  { key: 'high', label: 'דחוף', activeCls: 'bg-red-700 text-white border-red-700' },
  { key: 'medium', label: 'רגיל', activeCls: 'bg-orange-700 text-white border-orange-700' },
  { key: 'low', label: 'נמוך', activeCls: 'bg-blue-700 text-white border-blue-700' },
];

// Same wording written twice with different spacing/case still counts as the same task.
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Morning mode for the manager: pick one employee, type several tasks (one per line),
 * see what that employee already has open (to avoid duplicates), and send everything
 * at once. The employee gets a single notification, not one per task.
 */
export function MorningAssign({ db, setDb, saveDB, myName }: Props) {
  const employees = db.employees || [];
  const tasks = db.teamTasks || [];

  const [empId, setEmpId] = useState('');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  // Normalized lines the manager chose to add even though they look like duplicates.
  const [forced, setForced] = useState<Set<string>>(new Set());

  const openCount = (id: string) => tasks.filter((t) => t.employeeId === id && !(t.isDone || t.status === 'done')).length;
  const employee = employees.find((e) => e.id === empId);
  const existing = useMemo(
    () => tasks.filter((t) => t.employeeId === empId && !(t.isDone || t.status === 'done')),
    [tasks, empId]
  );
  const existingKeys = useMemo(() => new Set(existing.map((t) => norm(t.task))), [existing]);

  const lines = useMemo(() => {
    const seen = new Set<string>();
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const key = norm(l);
        const dup = existingKeys.has(key) || seen.has(key);
        seen.add(key);
        return { text: l, key, dup };
      });
  }, [text, existingKeys]);

  const toSend = lines.filter((l) => !l.dup || forced.has(l.key));
  const dupCount = lines.filter((l) => l.dup && !forced.has(l.key)).length;

  const toggleForced = (key: string) => {
    const next = new Set(forced);
    if (next.has(key)) next.delete(key); else next.add(key);
    setForced(next);
  };

  const send = () => {
    if (!employee) { toast.error('בחר עובד'); return; }
    if (toSend.length === 0) { toast.error('אין משימות חדשות לשליחה'); return; }
    const now = new Date().toISOString();
    const base = Date.now();
    const created: TeamTask[] = toSend.map((l, i) => ({
      id: `task-${base}-${i}`,
      employeeId: employee.id,
      task: l.text,
      priority,
      isDone: false,
      status: 'open',
      dueDate: dueDate || undefined,
      createdAt: now,
      assignedByName: myName,
      assigneeName: employee.name,
      activity: [{ text: `הוקצתה ל${employee.name} ע"י ${myName}`, at: now }],
    }));

    // One notification for the whole batch.
    const user = db.users.find(
      (u) => (employee.email && u.email && u.email.toLowerCase() === employee.email.toLowerCase()) || u.name === employee.name
    );
    let notif: Notification | null = null;
    if (user && user.name !== myName) {
      notif = {
        id: `n-${base}-batch`,
        userId: user.id,
        title: created.length === 1 ? 'משימה חדשה הוקצתה לך' : `${created.length} משימות חדשות הוקצו לך`,
        message: created.length === 1
          ? `${myName}: "${created[0].task}"`
          : `${myName}: ${created.slice(0, 3).map((t) => `"${t.task}"`).join(', ')}${created.length > 3 ? ` ועוד ${created.length - 3}` : ''}`,
        timestamp: now,
        isRead: false,
        type: 'info',
      };
    }

    const newDb: DB = {
      ...db,
      teamTasks: [...tasks, ...created],
      notifications: notif ? [...(db.notifications || []), notif] : db.notifications,
    };
    setDb(newDb);
    saveDB(newDb);
    logActivity('הקצאת בוקר', `${created.length} משימות → ${employee.name}`);
    toast.success(`${created.length} משימות נשלחו ל${employee.name}`);
    setText('');
    setForced(new Set());
    setDueDate('');
  };

  return (
    <Card className="border shadow-sm border-amber-300/60">
      <CardHeader className="bg-amber-50 border-b border-amber-200">
        <CardTitle className="text-lg text-amber-900 flex items-center gap-2"><Sun className="h-5 w-5" />הקצאת בוקר</CardTitle>
        <CardDescription className="text-amber-800">בוחרים עובד, כותבים משימה בכל שורה, ושולחים הכל בבת אחת.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">למי מקפיצים?</label>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => {
              const active = empId === emp.id;
              const n = openCount(emp.id);
              return (
                <button key={emp.id} type="button" aria-pressed={active}
                  onClick={() => { setEmpId(emp.id); setForced(new Set()); }}
                  className={cn('px-4 h-10 rounded-full border text-sm font-medium transition-colors inline-flex items-center gap-2', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}>
                  {emp.name}
                  <span className={cn('text-xs rounded-full px-1.5', active ? 'bg-white/20' : 'bg-muted')}>{n} פתוחות</span>
                </button>
              );
            })}
          </div>
        </div>

        {employee && (
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">כבר פתוח אצל {employee.name} ({existing.length})</p>
            {existing.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין משימות פתוחות, אפשר להקפיץ בראש שקט.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {existing.map((t) => (
                  <li key={t.id} className="text-sm flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', t.priority === 'high' ? 'bg-red-700' : t.priority === 'medium' ? 'bg-orange-600' : 'bg-blue-600')} aria-hidden="true" />
                    <span className="truncate">{t.task}</span>
                    {t.dueDate && <span className="text-xs text-muted-foreground shrink-0">יעד {t.dueDate.split('-').reverse().slice(0, 2).join('.')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="morningTasks" className="text-xs font-bold text-muted-foreground">משימות (אחת בכל שורה)</label>
          <textarea
            id="morningTasks"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={'הגשת דוח מע"מ לחברת כהן\nחישוב שכר נובמבר למשרד לוי\nהתקשרות ללקוח בנוגע לאישור ניהול ספרים'}
            className="w-full rounded-xl border border-input bg-background p-3 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        {lines.length > 0 && (
          <ul className="space-y-1.5" aria-label="תצוגה מקדימה של המשימות">
            {lines.map((l, i) => (
              <li key={i} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', l.dup && !forced.has(l.key) ? 'bg-amber-50 border-amber-200' : 'bg-background')}>
                {l.dup ? <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" /> : <span className="h-4 w-4 shrink-0" />}
                <span className={cn('flex-1', l.dup && !forced.has(l.key) && 'text-muted-foreground line-through')}>{l.text}</span>
                {l.dup && (
                  <button type="button" onClick={() => toggleForced(l.key)} className="text-xs underline text-amber-800 shrink-0">
                    {forced.has(l.key) ? 'בטל, אל תוסיף' : 'כבר קיימת, להוסיף בכל זאת?'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עדיפות לכל המשימות</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button key={p.key} type="button" aria-pressed={priority === p.key} onClick={() => setPriority(p.key)}
                  className={cn('px-4 h-10 rounded-full border text-sm font-bold transition-colors', priority === p.key ? p.activeCls : 'bg-background text-foreground border-border/60')}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="morningDue" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />תאריך יעד (לא חובה)</label>
            <Input id="morningDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-xl w-full" dir="ltr" />
          </div>
        </div>

        <Button onClick={send} disabled={!employee || toSend.length === 0} className="h-12 rounded-full w-full gap-2 text-base">
          <Send className="h-5 w-5" />
          {employee ? `שלח ${toSend.length} משימות ל${employee.name}` : 'בחר עובד'}
          {dupCount > 0 && <span className="text-xs opacity-80">({dupCount} כפולות לא יישלחו)</span>}
        </Button>
      </CardContent>
    </Card>
  );
}
