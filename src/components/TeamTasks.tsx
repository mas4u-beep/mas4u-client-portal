import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CheckCircle, Plus, Trash2, User as UserIcon, Bell, ArrowLeftRight, UserPlus, KeyRound, Mail, RotateCcw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, TeamTask, DB, User, Notification } from '@/src/types';
import { logActivity } from '@/src/lib/mockData';
import { toast } from 'sonner';

interface TeamTasksProps {
  db: DB;
  setDb: (db: DB) => void;
  saveDB: (db: DB) => void;
  currentUser?: User | null;
}

const PRIORITIES: { key: 'high' | 'medium' | 'low'; label: string; cls: string; activeCls: string }[] = [
  { key: 'high', label: 'דחוף', cls: 'text-red-600 border-red-200', activeCls: 'bg-red-500 text-white border-red-500' },
  { key: 'medium', label: 'רגיל', cls: 'text-orange-600 border-orange-200', activeCls: 'bg-orange-500 text-white border-orange-500' },
  { key: 'low', label: 'נמוך', cls: 'text-blue-600 border-blue-200', activeCls: 'bg-blue-500 text-white border-blue-500' },
];

export function TeamTasks({ db, setDb, saveDB, currentUser }: TeamTasksProps) {
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [assignee, setAssignee] = useState<string>('');
  const [showStaff, setShowStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', code: '' });

  const employees = db.employees || [];
  const tasks = db.teamTasks || [];

  const me = employees.find(
    (e) =>
      (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && e.name === currentUser.name)
  );
  const myName = currentUser?.name || me?.name || 'המשרד';

  // Default the assignee to myself for one-tap self-tasking.
  const effectiveAssignee = assignee || me?.id || (employees[0]?.id ?? '');

  const commit = (newDb: DB, msg?: string, kind: 'success' | 'info' = 'success') => {
    setDb(newDb);
    saveDB(newDb);
    if (msg) (kind === 'info' ? toast.info : toast.success)(msg);
  };

  const handleAddTask = () => {
    if (!newTask.trim()) { toast.error('כתוב תיאור משימה'); return; }
    if (!effectiveAssignee) { toast.error('בחר עובד'); return; }
    const target = employees.find((e) => e.id === effectiveAssignee);
    const now = new Date().toISOString();
    const newTaskObj: TeamTask = {
      id: `task-${Date.now()}`,
      employeeId: effectiveAssignee,
      task: newTask.trim(),
      priority: newTaskPriority,
      isDone: false,
      createdAt: now,
      assignedByName: myName,
      assigneeName: target?.name,
      activity: [{ text: `הוקצתה ל${target?.name || ''} ע"י ${myName}`, at: now }],
    };
    commit({ ...db, teamTasks: [...tasks, newTaskObj] }, `המשימה נשלחה ל${target?.name || ''}`);
    logActivity('הקצה משימה', `"${newTaskObj.task}" → ${target?.name || ''}`);
    setNewTask('');
    setNewTaskPriority('medium');
    setAssignee('');
  };

  const reassignTask = (taskId: string, newEmpId: string) => {
    const target = employees.find((e) => e.id === newEmpId);
    const now = new Date().toISOString();
    const newTasks = tasks.map((t) => {
      if (t.id !== taskId || t.employeeId === newEmpId) return t;
      const from = employees.find((e) => e.id === t.employeeId)?.name || t.assigneeName || '';
      return {
        ...t,
        employeeId: newEmpId,
        assigneeName: target?.name,
        activity: [...(t.activity || []), { text: `הועברה מ${from} ל${target?.name || ''} ע"י ${myName}`, at: now }],
      };
    });
    commit({ ...db, teamTasks: newTasks }, `המשימה הועברה ל${target?.name || ''}`);
    logActivity('העביר משימה', `→ ${target?.name || ''}`);
  };

  const setDone = (taskId: string, done: boolean) => {
    const now = new Date().toISOString();
    const original = tasks.find((t) => t.id === taskId);
    let notif: Notification | null = null;
    const newTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (done && t.assignedByName && t.assignedByName !== myName) {
        const assigner = db.users.find((u) => u.name === t.assignedByName);
        if (assigner) {
          notif = {
            id: `n-${Date.now()}`, userId: assigner.id, title: 'משימה בוצעה ✓',
            message: `${myName} השלים/ה את המשימה: "${t.task}"`, timestamp: now, isRead: false, type: 'success',
          };
        }
      }
      return { ...t, isDone: done, activity: [...(t.activity || []), { text: done ? `בוצעה ע"י ${myName}` : `הוחזרה לפתוחה ע"י ${myName}`, at: now }] };
    });
    const newDb: DB = { ...db, teamTasks: newTasks, notifications: notif ? [...(db.notifications || []), notif] : db.notifications };
    commit(newDb, done ? 'סומן כבוצע ✓' : undefined);
    if (done && original) logActivity('סיים משימה', `"${original.task}"`);
  };

  const deleteTask = (taskId: string) => {
    commit({ ...db, teamTasks: tasks.filter((t) => t.id !== taskId) }, 'המשימה נמחקה', 'info');
  };

  const handleAddStaff = () => {
    const name = newStaff.name.trim();
    const email = newStaff.email.trim().toLowerCase();
    const code = newStaff.code.trim();
    if (!name || !email || !code) { toast.error('יש למלא שם, אימייל וקוד כניסה'); return; }
    if (db.users.some((u) => u.email && u.email.toLowerCase() === email) || employees.some((e) => e.email && e.email.toLowerCase() === email)) {
      toast.error('כתובת האימייל כבר קיימת במערכת'); return;
    }
    const id = `emp-${Date.now()}`;
    const newEmp: Employee = { id, name, role: 'employee', email, code };
    const newUser: User = { id: `staff-${id}`, name, email, role: 'admin', personalCode: code, status: 'active', lastUpdate: new Date().toISOString() } as User;
    commit({ ...db, employees: [...employees, newEmp], users: [...db.users, newUser] }, `${name} נוסף/ה כאיש צוות ויכול/ה להתחבר`);
    logActivity('הוסיף איש צוות', name);
    setNewStaff({ name: '', email: '', code: '' });
  };

  const myOpenTasks = tasks.filter((t) => me && t.employeeId === me.id && !t.isDone);
  const assignedByMeDone = tasks.filter((t) => t.assignedByName === myName && t.isDone && t.employeeId !== me?.id);

  // A single task row — used in "my tasks" and in the per-employee boards.
  const TaskRow = ({ task, showAssignee }: { task: TeamTask; showAssignee?: boolean }) => (
    <div className={cn('p-3 rounded-xl border transition-all', task.isDone ? 'bg-muted/20 border-transparent opacity-70' : 'bg-background border-primary/10 shadow-sm')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', task.isDone && 'line-through text-muted-foreground')}>{task.task}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {!task.isDone && (
              <span className={cn('text-[10px] font-bold', task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-orange-500' : 'text-blue-500')}>
                {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'רגיל' : 'נמוך'}
              </span>
            )}
            {showAssignee && task.assigneeName && <span className="text-[10px] text-muted-foreground">ל: {task.assigneeName}</span>}
            {task.assignedByName && <span className="text-[10px] text-muted-foreground">מאת: {task.assignedByName}</span>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => deleteTask(task.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {task.isDone ? (
          <Button size="sm" variant="ghost" className="rounded-full gap-1 text-muted-foreground h-8" onClick={() => setDone(task.id, false)}>
            <RotateCcw className="h-3.5 w-3.5" />החזר לפתוחה
          </Button>
        ) : (
          <Button size="sm" className="rounded-full gap-1 bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => setDone(task.id, true)}>
            <CheckCircle className="h-4 w-4" />סמן כבוצע
          </Button>
        )}
        {!task.isDone && employees.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button size="sm" variant="outline" className="rounded-full gap-1 h-8"><ArrowLeftRight className="h-3.5 w-3.5" />העבר</Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>העבר לעובד</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {employees.filter((e) => e.id !== task.employeeId).map((e) => (
                <DropdownMenuItem key={e.id} onClick={() => reassignTask(task.id, e.id)}>{e.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Identity + staff toggle */}
      <Card className="border-none shadow-sm bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">מחובר/ת כ:</span>
            <span className="font-bold text-primary">{myName}</span>
          </div>
          <Button size="sm" variant="outline" className="rounded-full gap-2 border-primary/20 bg-background" onClick={() => setShowStaff((s) => !s)}>
            <UserPlus className="h-4 w-4" />
            {showStaff ? 'הסתר ניהול צוות' : 'ניהול צוות והרשאות'}
          </Button>
        </CardContent>
      </Card>

      {/* Staff management */}
      {showStaff && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg text-primary">צוות המשרד והרשאות כניסה</CardTitle>
            <CardDescription>לכל איש צוות יש התחברות אישית לצד המשרד (אימייל + קוד).</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border/50 flex-wrap">
                  <div className="flex items-center gap-2 font-bold"><UserIcon className="h-4 w-4 text-primary" />{emp.name}
                    {emp.role === 'manager' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">מנהל</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{emp.email || '—'}</span>
                    <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" />קוד: <b className="text-foreground">{emp.code || '—'}</b></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pt-2 border-t">
              <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">שם איש צוות</label>
                <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="שם מלא" className="h-10 rounded-full" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">אימייל להתחברות</label>
                <Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="name@mas4u.co.il" className="h-10 rounded-full" dir="ltr" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">קוד כניסה</label>
                <Input value={newStaff.code} onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })} placeholder="4006" className="h-10 rounded-full" dir="ltr" /></div>
              <Button onClick={handleAddStaff} className="h-10 rounded-full w-full gap-2"><UserPlus className="h-4 w-4" />הוסף איש צוות</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New task — chip based, no dropdowns */}
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg text-primary flex items-center gap-2"><Plus className="h-5 w-5" />משימה חדשה</CardTitle>
          <CardDescription>תירשם עם שמך כמקצה ({myName}).</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">מה צריך לעשות?</label>
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
              placeholder="לדוגמה: הגשת דוח 856 לחברת החשמל"
              className="h-12 rounded-xl text-base"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">למי מעבירים?</label>
            <div className="flex flex-wrap gap-2">
              {employees.map((emp) => {
                const active = effectiveAssignee === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setAssignee(emp.id)}
                    className={cn('px-4 h-10 rounded-full border text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}
                  >
                    {emp.name}{me?.id === emp.id ? ' (אני)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עדיפות</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const active = newTaskPriority === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setNewTaskPriority(p.key)}
                    className={cn('px-4 h-10 rounded-full border text-sm font-bold transition-colors', active ? p.activeCls : cn('bg-background', p.cls))}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Button onClick={handleAddTask} className="h-12 rounded-full w-full gap-2 text-base">
            <Plus className="h-5 w-5" />שלח משימה
          </Button>
        </CardContent>
      </Card>

      {/* My tasks — front and center */}
      <Card className="border shadow-sm border-primary/30">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" />המשימות שלי</CardTitle>
          <CardDescription>{myOpenTasks.length > 0 ? `${myOpenTasks.length} משימות פתוחות שהוקצו לך` : 'אין משימות פתוחות'}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {myOpenTasks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">כל הכבוד! אין משימות פתוחות 🎉</div>
          ) : (
            myOpenTasks.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </CardContent>
      </Card>

      {/* Tasks I assigned that were completed */}
      {assignedByMeDone.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800"><CheckCircle className="h-5 w-5" />משימות שהקצית — בוצעו</CardTitle>
            <CardDescription className="text-green-700/80">{assignedByMeDone.length} משימות שהעברת הושלמו</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {assignedByMeDone.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                <span className="text-sm line-through text-muted-foreground">{t.task}</span>
                <span className="text-[11px] text-green-700 font-bold">✓ {t.assigneeName || ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All boards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const empTasks = tasks.filter((t) => t.employeeId === emp.id);
          const pendingCount = empTasks.filter((t) => !t.isDone).length;
          const isMe = me?.id === emp.id;
          return (
            <Card key={emp.id} className={cn('border shadow-sm bg-card/50', isMe ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}>
              <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" />{emp.name}
                    {isMe && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">אני</span>}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">{pendingCount > 0 ? `${pendingCount} משימות פתוחות` : 'אין משימות פתוחות'}</CardDescription>
                </div>
                {pendingCount > 0 && <Bell className={cn('h-4 w-4', pendingCount > 3 ? 'text-red-500 animate-pulse' : 'text-primary')} />}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {empTasks.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">אין משימות לעובד זה</div>
                ) : (
                  empTasks.map((task) => <TaskRow key={task.id} task={task} />)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
