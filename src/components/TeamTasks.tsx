import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Plus, Trash2, User as UserIcon, Bell, ArrowLeftRight, UserPlus, KeyRound, Mail } from 'lucide-react';
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

export function TeamTasks({ db, setDb, saveDB, currentUser }: TeamTasksProps) {
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedEmployeeForNewTask, setSelectedEmployeeForNewTask] = useState<string>('');
  const [showStaff, setShowStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', code: '' });

  const employees = db.employees || [];
  const tasks = db.teamTasks || [];

  // Who am I (match the logged-in user to a staff member).
  const me = employees.find(
    (e) =>
      (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && e.name === currentUser.name)
  );
  const myName = currentUser?.name || me?.name || 'המשרד';

  const commit = (newDb: DB, msg?: string, kind: 'success' | 'info' = 'success') => {
    setDb(newDb);
    saveDB(newDb);
    if (msg) (kind === 'info' ? toast.info : toast.success)(msg);
  };

  const handleAddTask = () => {
    if (!newTask || !selectedEmployeeForNewTask) {
      toast.error('יש לבחור עובד ולהזין תיאור משימה');
      return;
    }
    const assignee = employees.find((e) => e.id === selectedEmployeeForNewTask);
    const now = new Date().toISOString();
    const newTaskObj: TeamTask = {
      id: `task-${Date.now()}`,
      employeeId: selectedEmployeeForNewTask,
      task: newTask,
      priority: newTaskPriority,
      isDone: false,
      createdAt: now,
      assignedByName: myName,
      assigneeName: assignee?.name,
      activity: [{ text: `הוקצתה ל${assignee?.name || ''} ע"י ${myName}`, at: now }],
    };
    commit({ ...db, teamTasks: [...tasks, newTaskObj] }, 'המשימה נוספה בהצלחה');
    logActivity('הקצה משימה', `"${newTask}" → ${assignee?.name || ''}`);
    setNewTask('');
    setNewTaskPriority('medium');
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

  const toggleTaskStatus = (taskId: string) => {
    const now = new Date().toISOString();
    const original = tasks.find((t) => t.id === taskId);
    const willBeDone = original ? !original.isDone : false;
    let notif: Notification | null = null;
    const newTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const done = !t.isDone;
      if (done) {
        toast.success(`המשימה "${t.task}" הושלמה!`);
        // Notify whoever assigned the task (unless they completed it themselves).
        if (t.assignedByName && t.assignedByName !== myName) {
          const assigner = db.users.find((u) => u.name === t.assignedByName);
          if (assigner) {
            notif = {
              id: `n-${Date.now()}`,
              userId: assigner.id,
              title: 'משימה בוצעה ✓',
              message: `${myName} השלים/ה את המשימה: "${t.task}"`,
              timestamp: now,
              isRead: false,
              type: 'success',
            };
          }
        }
      }
      return {
        ...t,
        isDone: done,
        activity: [...(t.activity || []), { text: done ? `הושלמה ע"י ${myName}` : `הוחזרה לפתוחה ע"י ${myName}`, at: now }],
      };
    });
    const newDb: DB = {
      ...db,
      teamTasks: newTasks,
      notifications: notif ? [...(db.notifications || []), notif] : db.notifications,
    };
    commit(newDb);
    if (willBeDone && original) logActivity('סיים משימה', `"${original.task}"`);
  };

  const deleteTask = (taskId: string) => {
    commit({ ...db, teamTasks: tasks.filter((t) => t.id !== taskId) }, 'המשימה נמחקה', 'info');
  };

  const handleAddStaff = () => {
    const name = newStaff.name.trim();
    const email = newStaff.email.trim().toLowerCase();
    const code = newStaff.code.trim();
    if (!name || !email || !code) {
      toast.error('יש למלא שם, אימייל וקוד כניסה');
      return;
    }
    if (db.users.some((u) => u.email && u.email.toLowerCase() === email) ||
        employees.some((e) => e.email && e.email.toLowerCase() === email)) {
      toast.error('כתובת האימייל כבר קיימת במערכת');
      return;
    }
    const id = `emp-${Date.now()}`;
    const newEmp: Employee = { id, name, role: 'employee', email, code };
    const newUser: User = {
      id: `staff-${id}`,
      name,
      email,
      role: 'admin',
      personalCode: code,
      status: 'active',
      lastUpdate: new Date().toISOString(),
    } as User;
    commit(
      { ...db, employees: [...employees, newEmp], users: [...db.users, newUser] },
      `${name} נוסף/ה כאיש צוות ויכול/ה להתחבר`
    );
    logActivity('הוסיף איש צוות', name);
    setNewStaff({ name: '', email: '', code: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header / identity + staff toggle */}
      <Card className="border-none shadow-sm bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">מחובר/ת כ:</span>
            <span className="font-bold text-primary">{myName}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full gap-2 border-primary/20 bg-background"
            onClick={() => setShowStaff((s) => !s)}
          >
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
                  <div className="flex items-center gap-2 font-bold">
                    <UserIcon className="h-4 w-4 text-primary" />
                    {emp.name}
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
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">שם איש צוות</label>
                <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="שם מלא" className="h-10 rounded-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">אימייל להתחברות</label>
                <Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="name@mas4u.co.il" className="h-10 rounded-full" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">קוד כניסה</label>
                <Input value={newStaff.code} onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })} placeholder="לדוגמה: 4006" className="h-10 rounded-full" dir="ltr" />
              </div>
              <Button onClick={handleAddStaff} className="h-10 rounded-full w-full gap-2">
                <UserPlus className="h-4 w-4" />
                הוסף איש צוות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign a new task — available to every logged-in staff member */}
      <Card className="border-none shadow-sm shadow-blue-100">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg text-primary">הקצאת משימה חדשה</CardTitle>
          <CardDescription>המשימה תירשם עם שמך כמקצה ({myName}).</CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עובד מבצע</label>
            <Select value={selectedEmployeeForNewTask} onValueChange={setSelectedEmployeeForNewTask}>
              <SelectTrigger className="h-10 rounded-full"><SelectValue placeholder="בחר עובד..." /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עדיפות</label>
            <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as 'high' | 'medium' | 'low')}>
              <SelectTrigger className="h-10 rounded-full"><SelectValue placeholder="עדיפות..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">דחוף</SelectItem>
                <SelectItem value="medium">רגיל</SelectItem>
                <SelectItem value="low">עדיפות נמוכה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-muted-foreground">תיאור המשימה</label>
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="לדוגמה: הגשת דוח 856 לחברת החשמל" className="h-10 rounded-full" />
          </div>
          <Button onClick={handleAddTask} className="h-10 rounded-full w-full gap-2">
            <Plus className="h-4 w-4" />
            הוסף משימה
          </Button>
        </CardContent>
      </Card>

      {/* Boards — everyone sees all boards; mine is highlighted */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const empTasks = tasks.filter((t) => t.employeeId === emp.id);
          const pendingCount = empTasks.filter((t) => !t.isDone).length;
          const isMe = me?.id === emp.id;

          return (
            <Card key={emp.id} className={cn('border shadow-sm bg-card/50', isMe ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}>
              <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    {emp.name}
                    {isMe && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">אני</span>}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {pendingCount > 0 ? `${pendingCount} משימות פתוחות` : 'אין משימות פתוחות'}
                  </CardDescription>
                </div>
                {pendingCount > 0 && (
                  <Bell className={cn('h-4 w-4', pendingCount > 3 ? 'text-red-500 animate-pulse' : 'text-primary')} />
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {empTasks.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">אין משימות לעובד זה</div>
                ) : (
                  empTasks.map((task) => (
                    <div key={task.id} className={cn(
                      'p-3 rounded-xl border transition-all',
                      task.isDone ? 'bg-muted/20 border-transparent opacity-60' : 'bg-background border-primary/10 shadow-sm'
                    )}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTaskStatus(task.id)}
                            className={cn(
                              'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5',
                              task.isDone ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30 hover:border-primary'
                            )}
                          >
                            {task.isDone && <CheckCircle className="h-3 w-3" />}
                          </button>
                          <div className="flex flex-col gap-1">
                            <span className={cn('text-sm font-medium', task.isDone && 'line-through')}>{task.task}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {!task.isDone && (
                                <span className={cn(
                                  'text-[10px] uppercase font-bold tracking-wider',
                                  task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-orange-500' : 'text-blue-500'
                                )}>
                                  {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'רגיל' : 'עדיפות נמוכה'}
                                </span>
                              )}
                              {task.assignedByName && (
                                <span className="text-[10px] text-muted-foreground">מאת: {task.assignedByName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => deleteTask(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Hand-off control */}
                      {!task.isDone && employees.length > 1 && (
                        <div className="flex items-center gap-2 mt-2 pr-8">
                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Select value="" onValueChange={(v) => reassignTask(task.id, v)}>
                            <SelectTrigger className="h-7 rounded-full text-[11px] w-full"><SelectValue placeholder="העבר לעובד אחר..." /></SelectTrigger>
                            <SelectContent>
                              {employees.filter((e) => e.id !== task.employeeId).map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Latest activity line */}
                      {task.activity && task.activity.length > 0 && (
                        <div className="text-[10px] text-muted-foreground/80 mt-2 pr-8">
                          {task.activity[task.activity.length - 1].text}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
