import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CheckCircle, Plus, Trash2, User as UserIcon, Bell, ArrowLeftRight, UserPlus, Mail,
  RotateCcw, Inbox, Calendar, Clock, PlayCircle, Link2, Search, AlertTriangle,
  GripVertical, ChevronUp, ChevronDown, HelpCircle, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, TeamTask, TeamTaskStatus, DB, User, Notification } from '@/src/types';
import { logActivity, buildAssigneeNotification } from '@/src/lib/mockData';
import { toast } from 'sonner';
import { MorningAssign } from './MorningAssign';

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
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const priorityLabel = (p: string) => (p === 'high' ? 'דחוף' : p === 'medium' ? 'רגיל' : 'נמוך');

const todayYMD = () => new Date().toISOString().slice(0, 10);
const statusOf = (t: TeamTask): TeamTaskStatus => t.status || (t.isDone ? 'done' : 'open');
const isOverdue = (t: TeamTask) => !!t.dueDate && statusOf(t) !== 'done' && t.dueDate < todayYMD();
const fmtDate = (ymd?: string) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}.${m}.${y.slice(2)}`;
};

type SortKey = 'manual' | 'smart' | 'due' | 'priority';

export function TeamTasks({ db, setDb, saveDB, currentUser }: TeamTasksProps) {
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [showStaff, setShowStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '' });

  // Board filters
  const [boardSearch, setBoardSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('manual');
  const [hideDone, setHideDone] = useState(true);

  // Reassign dialog (with reason)
  const [reassignFor, setReassignFor] = useState<TeamTask | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Drag & drop ordering, questions and clearing finished tasks
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [askFor, setAskFor] = useState<string | null>(null);
  const [askText, setAskText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  const employees = db.employees || [];
  const tasks = db.teamTasks || [];

  const me = employees.find(
    (e) =>
      (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && e.name === currentUser.name)
  );
  const myName = currentUser?.name || me?.name || 'המשרד';
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
      status: 'open',
      dueDate: newDueDate || undefined,
      createdAt: now,
      assignedByName: myName,
      assigneeName: target?.name,
      activity: [{ text: `הוקצתה ל${target?.name || ''} ע"י ${myName}`, at: now }],
    };
    const notif = buildAssigneeNotification(db, newTaskObj, myName);
    commit(
      { ...db, teamTasks: [...tasks, newTaskObj], notifications: notif ? [...(db.notifications || []), notif] : db.notifications },
      `המשימה נשלחה ל${target?.name || ''}`
    );
    logActivity('הקצה משימה', `"${newTaskObj.task}" → ${target?.name || ''}`);
    setNewTask('');
    setNewTaskPriority('medium');
    setNewDueDate('');
    setAssignee('');
  };

  const openReassign = (task: TeamTask) => {
    setReassignFor(task);
    setReassignTo('');
    setReassignReason('');
  };
  const confirmReassign = () => {
    if (!reassignFor || !reassignTo) { toast.error('בחר עובד'); return; }
    const task = reassignFor;
    const target = employees.find((e) => e.id === reassignTo);
    const from = employees.find((e) => e.id === task.employeeId)?.name || task.assigneeName || '';
    const now = new Date().toISOString();
    const reason = reassignReason.trim();
    const updated: TeamTask = {
      ...task,
      employeeId: reassignTo,
      assigneeName: target?.name,
      assignedByName: myName,
      activity: [...(task.activity || []), { text: `הועברה מ${from} ל${target?.name || ''} ע"י ${myName}${reason ? ` — ${reason}` : ''}`, at: now }],
    };
    const notif = buildAssigneeNotification(db, updated, myName, true);
    const newTasks = tasks.map((t) => (t.id === task.id ? updated : t));
    commit(
      { ...db, teamTasks: newTasks, notifications: notif ? [...(db.notifications || []), notif] : db.notifications },
      `המשימה הועברה ל${target?.name || ''}`
    );
    logActivity('העביר משימה', `→ ${target?.name || ''}${reason ? ` (${reason})` : ''}`);
    setReassignFor(null);
  };

  const setStatus = (taskId: string, status: TeamTaskStatus) => {
    const now = new Date().toISOString();
    const original = tasks.find((t) => t.id === taskId);
    if (!original) return;
    let notif: Notification | null = null;
    const done = status === 'done';
    if (done && original.assignedByName && original.assignedByName !== myName) {
      const assigner = db.users.find((u) => u.name === original.assignedByName);
      if (assigner) {
        notif = {
          id: `n-${Date.now()}`, userId: assigner.id, title: 'משימה בוצעה ✓',
          message: `${myName} השלים/ה את המשימה: "${original.task}"`, timestamp: now, isRead: false, type: 'success',
        };
      }
    }
    const label = status === 'done' ? `בוצעה ע"י ${myName}` : status === 'in_progress' ? `נלקחה לטיפול ע"י ${myName}` : `הוחזרה לפתוחה ע"י ${myName}`;
    const newTasks = tasks.map((t) => (t.id === taskId ? { ...t, status, isDone: done, activity: [...(t.activity || []), { text: label, at: now }] } : t));
    const newDb: DB = { ...db, teamTasks: newTasks, notifications: notif ? [...(db.notifications || []), notif] : db.notifications };
    commit(newDb, status === 'done' ? 'סומן כבוצע ✓' : status === 'in_progress' ? 'סומן בטיפול' : undefined, status === 'in_progress' ? 'info' : 'success');
    if (done) logActivity('סיים משימה', `"${original.task}"`);
  };

  const deleteTask = (taskId: string) => {
    commit({ ...db, teamTasks: tasks.filter((t) => t.id !== taskId) }, 'המשימה נמחקה', 'info');
  };


  // ---- Manual ordering -----------------------------------------------------
  // `ids` is the list of open tasks of one employee in the order currently shown.
  const applyOrder = (ids: string[]) => {
    const pos = new Map(ids.map((id, i) => [id, i]));
    const newTasks = tasks.map((t) => (pos.has(t.id) ? { ...t, order: pos.get(t.id)! } : t));
    setSortKey('manual');
    commit({ ...db, teamTasks: newTasks });
  };
  const openIdsFor = (employeeId: string) =>
    sortTasks(tasks.filter((t) => t.employeeId === employeeId && statusOf(t) !== 'done')).map((t) => t.id);
  const dropOn = (targetId: string) => {
    const dragged = tasks.find((t) => t.id === dragId);
    const target = tasks.find((t) => t.id === targetId);
    setDragId(null); setOverId(null);
    if (!dragged || !target || dragged.id === target.id || dragged.employeeId !== target.employeeId) return;
    const ids = openIdsFor(dragged.employeeId).filter((id) => id !== dragged.id);
    ids.splice(ids.indexOf(target.id), 0, dragged.id);
    applyOrder(ids);
  };
  const moveBy = (task: TeamTask, delta: number) => {
    const ids = openIdsFor(task.employeeId);
    const i = ids.indexOf(task.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyOrder(ids);
  };

  // ---- Questions on a task -------------------------------------------------
  const sendQuestion = (task: TeamTask) => {
    const text = askText.trim();
    if (!text) { toast.error('כתוב את השאלה'); return; }
    const now = new Date().toISOString();
    const q = { id: `q-${Date.now()}`, from: myName, text, at: now };
    const assigner = db.users.find((u) => u.name === task.assignedByName);
    const notif: Notification | null = assigner && assigner.name !== myName ? {
      id: `n-${Date.now()}-q`, userId: assigner.id, title: 'שאלה על משימה ❓',
      message: `${myName} שואל/ת על "${task.task}": ${text}`, timestamp: now, isRead: false, type: 'warning',
    } : null;
    const newTasks = tasks.map((t) => (t.id === task.id ? { ...t, questions: [...(t.questions || []), q], activity: [...(t.activity || []), { text: `${myName} שאל/ה שאלה`, at: now }] } : t));
    commit({ ...db, teamTasks: newTasks, notifications: notif ? [...(db.notifications || []), notif] : db.notifications },
      notif ? 'השאלה נשלחה' : 'השאלה נשמרה על המשימה');
    logActivity('שאל שאלה על משימה', `"${task.task}"`);
    setAskFor(null); setAskText('');
  };
  const answerQuestion = (task: TeamTask, qid: string) => {
    const text = (answers[qid] || '').trim();
    if (!text) { toast.error('כתוב תשובה'); return; }
    const now = new Date().toISOString();
    const q = (task.questions || []).find((x) => x.id === qid);
    if (!q) return;
    const asker = db.users.find((u) => u.name === q.from);
    const notif: Notification | null = asker && asker.name !== myName ? {
      id: `n-${Date.now()}-a`, userId: asker.id, title: 'ענו לשאלה שלך',
      message: `${myName} ענה/תה על "${task.task}": ${text}`, timestamp: now, isRead: false, type: 'info',
    } : null;
    const newTasks = tasks.map((t) => (t.id === task.id
      ? { ...t, questions: (t.questions || []).map((x) => (x.id === qid ? { ...x, answer: text, answeredBy: myName, answeredAt: now } : x)), activity: [...(t.activity || []), { text: `${myName} ענה/תה על שאלה`, at: now }] }
      : t));
    commit({ ...db, teamTasks: newTasks, notifications: notif ? [...(db.notifications || []), notif] : db.notifications }, 'התשובה נשלחה');
    setAnswers((a) => { const n = { ...a }; delete n[qid]; return n; });
  };

  const clearDone = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 5000); return; }
    const ids = new Set(assignedByMeDone.map((t) => t.id));
    commit({ ...db, teamTasks: tasks.filter((t) => !ids.has(t.id)) }, `${ids.size} משימות שבוצעו נוקו`, 'info');
    setConfirmClear(false);
  };

  const handleAddStaff = () => {
    const name = newStaff.name.trim();
    const email = newStaff.email.trim().toLowerCase();
    if (!name || !email) { toast.error('יש למלא שם ואימייל'); return; }
    if (db.users.some((u) => u.email && u.email.toLowerCase() === email) || employees.some((e) => e.email && e.email.toLowerCase() === email)) {
      toast.error('כתובת האימייל כבר קיימת במערכת'); return;
    }
    const id = `emp-${Date.now()}`;
    const newEmp: Employee = { id, name, role: 'employee', email };
    const newUser: User = { id: `staff-${id}`, name, email, role: 'admin', status: 'active', lastUpdate: new Date().toISOString() } as User;
    commit({ ...db, employees: [...employees, newEmp], users: [...db.users, newUser] }, `${name} נוסף/ה כאיש צוות — כדי שיוכל/תוכל להתחבר, יש לפתוח חשבון ב-Supabase עם אותו אימייל`);
    logActivity('הוסיף איש צוות', name);
    setNewStaff({ name: '', email: '' });
  };

  // Sorting used by boards + my-tasks.
  const sortTasks = (list: TeamTask[]) => {
    const arr = [...list];
    arr.sort((a, b) => {
      // Done always sinks.
      const ad = statusOf(a) === 'done' ? 1 : 0, bd = statusOf(b) === 'done' ? 1 : 0;
      if (ad !== bd) return ad - bd;
      if (sortKey === 'manual' && (a.order !== undefined || b.order !== undefined)) {
        // tasks without a manual position go after the ones the employee arranged
        const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
        if (ao !== bo) return ao - bo;
      }
      if (sortKey === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sortKey === 'due') {
        const av = a.dueDate || '9999', bv = b.dueDate || '9999';
        return av.localeCompare(bv);
      }
      // smart: overdue first, then due date, then priority
      const ao = isOverdue(a) ? 0 : 1, bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const av = a.dueDate || '9999', bv = b.dueDate || '9999';
      if (av !== bv) return av.localeCompare(bv);
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
    return arr;
  };
  const matchesSearch = (t: TeamTask) => {
    const q = boardSearch.trim().toLowerCase();
    if (!q) return true;
    return [t.task, t.assigneeName, t.assignedByName, t.clientName].some((v) => String(v ?? '').toLowerCase().includes(q));
  };

  const myOpen = sortTasks(tasks.filter((t) => me && t.employeeId === me.id && statusOf(t) !== 'done'));
  const assignedByMeDone = tasks.filter((t) => t.assignedByName === myName && statusOf(t) === 'done' && t.employeeId !== me?.id);

  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  // A single task row.
  const TaskRow = ({ task, showAssignee }: { task: TeamTask; showAssignee?: boolean }) => {
    const st = statusOf(task);
    const done = st === 'done';
    const overdue = isOverdue(task);
    const canDrag = !done;
    const pendingQs = (task.questions || []).filter((q) => !q.answer);
    const iAmAsker = task.assignedByName === myName;
    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => { if (!canDrag) return; setDragId(task.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => { if (dragId && dragId !== task.id) { e.preventDefault(); setOverId(task.id); } }}
        onDrop={(e) => { e.preventDefault(); dropOn(task.id); }}
        onDragEnd={() => { setDragId(null); setOverId(null); }}
        className={cn('p-3 rounded-xl border transition-all', canDrag && 'cursor-grab active:cursor-grabbing', dragId === task.id && 'opacity-40', overId === task.id && dragId !== task.id && 'ring-2 ring-primary', done ? 'bg-muted/20 border-transparent opacity-70' : overdue ? 'bg-red-50/60 border-red-200 shadow-sm' : 'bg-background border-primary/10 shadow-sm')}>
        <div className="flex items-start justify-between gap-2">
          {canDrag && (
            <div className="flex flex-col items-center shrink-0 -mr-1">
              <button type="button" aria-label="הזז משימה למעלה" className="h-5 w-6 text-muted-foreground hover:text-primary" onClick={() => moveBy(task, -1)}><ChevronUp className="h-4 w-4 mx-auto" /></button>
              <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <button type="button" aria-label="הזז משימה למטה" className="h-5 w-6 text-muted-foreground hover:text-primary" onClick={() => moveBy(task, 1)}><ChevronDown className="h-4 w-4 mx-auto" /></button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-medium', done && 'line-through text-muted-foreground')}>{task.task}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              {!done && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', task.priority === 'high' ? 'text-red-600 bg-red-100' : task.priority === 'medium' ? 'text-orange-600 bg-orange-100' : 'text-blue-600 bg-blue-100')}>
                  {priorityLabel(task.priority)}
                </span>
              )}
              {st === 'in_progress' && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Clock className="h-3 w-3" />בטיפול</span>}
              {task.dueDate && (
                <span className={cn('text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded', overdue ? 'text-red-700 bg-red-100 font-bold' : 'text-muted-foreground bg-muted')}>
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {overdue ? 'באיחור · ' : 'יעד '}{fmtDate(task.dueDate)}
                </span>
              )}
              {task.clientName && <span className="text-[10px] inline-flex items-center gap-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded"><Link2 className="h-3 w-3" />{task.clientName}</span>}
              {showAssignee && task.assigneeName && <span className="text-[10px] text-muted-foreground">ל: {task.assigneeName}</span>}
              {task.assignedByName && <span className="text-[10px] text-muted-foreground">מאת: {task.assignedByName}</span>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => deleteTask(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {done ? (
            <Button size="sm" variant="ghost" className="rounded-full gap-1 text-muted-foreground h-8" onClick={() => setStatus(task.id, 'open')}>
              <RotateCcw className="h-3.5 w-3.5" />החזר לפתוחה
            </Button>
          ) : (
            <>
              <Button size="sm" className="rounded-full gap-1 bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => setStatus(task.id, 'done')}>
                <CheckCircle className="h-4 w-4" />סמן כבוצע
              </Button>
              {st !== 'in_progress' ? (
                <Button size="sm" variant="outline" className="rounded-full gap-1 h-8 text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => setStatus(task.id, 'in_progress')}>
                  <PlayCircle className="h-3.5 w-3.5" />בטיפול
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="rounded-full gap-1 h-8 text-muted-foreground" onClick={() => setStatus(task.id, 'open')}>
                  <RotateCcw className="h-3.5 w-3.5" />החזר לפתוחה
                </Button>
              )}
              {task.assignedByName && !iAmAsker && (
                <Button size="sm" variant="outline" className="rounded-full gap-1 h-8" onClick={() => { setAskFor(askFor === task.id ? null : task.id); setAskText(''); }}>
                  <HelpCircle className="h-3.5 w-3.5" />שאלה
                </Button>
              )}
              {employees.length > 1 && (
                <Button size="sm" variant="outline" className="rounded-full gap-1 h-8" onClick={() => openReassign(task)}>
                  <ArrowLeftRight className="h-3.5 w-3.5" />העבר
                </Button>
              )}
            </>
          )}
        </div>

        {askFor === task.id && (
          <div className="mt-3 flex gap-2">
            <Input value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendQuestion(task)} autoFocus
              aria-label="השאלה שלך על המשימה" placeholder={`מה תרצה לשאול את ${task.assignedByName}?`} className="h-9 rounded-xl" />
            <Button size="sm" className="rounded-full gap-1 h-9" onClick={() => sendQuestion(task)}><Send className="h-3.5 w-3.5" />שלח</Button>
          </div>
        )}

        {(task.questions || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(task.questions || []).map((q) => (
              <div key={q.id} className={cn('rounded-lg border p-2 text-sm', q.answer ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200')}>
                <p><span className="font-bold">{q.from} שאל/ה:</span> {q.text}</p>
                {q.answer ? (
                  <p className="mt-1 text-green-900"><span className="font-bold">{q.answeredBy} ענה/תה:</span> {q.answer}</p>
                ) : iAmAsker ? (
                  <div className="mt-2 flex gap-2">
                    <Input value={answers[q.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && answerQuestion(task, q.id)}
                      aria-label="תשובה לשאלה" placeholder="כתוב תשובה..." className="h-9 rounded-xl bg-background" />
                    <Button size="sm" className="rounded-full h-9" onClick={() => answerQuestion(task, q.id)}>ענה</Button>
                  </div>
                ) : (
                  <p className="mt-1 text-amber-900 text-xs">ממתין לתשובה מ{task.assignedByName}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {pendingQs.length > 0 && iAmAsker && <span className="sr-only">יש שאלות שממתינות לתשובה</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Identity + staff toggle */}
      <Card className="border-none shadow-sm bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-primary" /><span className="text-muted-foreground">מחובר/ת כ:</span><span className="font-bold text-primary">{myName}</span></span>
            {overdueCount > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" />{overdueCount} משימות באיחור</span>}
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
            <CardDescription>ההתחברות של כל איש צוות נעשית עם האימייל והסיסמה האישית שלו (הסיסמאות מוגדרות ב-Supabase ולא נשמרות באתר).</CardDescription>
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
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2 border-t">
              <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">שם איש צוות</label>
                <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="שם מלא" className="h-10 rounded-full" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-muted-foreground">אימייל להתחברות</label>
                <Input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="name@mas4u.co.il" className="h-10 rounded-full" dir="ltr" /></div>
              <Button onClick={handleAddStaff} className="h-10 rounded-full w-full gap-2"><UserPlus className="h-4 w-4" />הוסף איש צוות</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <MorningAssign db={db} setDb={setDb} saveDB={saveDB} myName={myName} />

      {/* New task */}
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">למי מעבירים?</label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => {
                  const active = effectiveAssignee === emp.id;
                  return (
                    <button key={emp.id} type="button" onClick={() => setAssignee(emp.id)}
                      className={cn('px-4 h-10 rounded-full border text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}>
                      {emp.name}{me?.id === emp.id ? ' (אני)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />תאריך יעד (לא חובה)</label>
              <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="h-10 rounded-xl w-full" dir="ltr" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עדיפות</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const active = newTaskPriority === p.key;
                return (
                  <button key={p.key} type="button" onClick={() => setNewTaskPriority(p.key)}
                    className={cn('px-4 h-10 rounded-full border text-sm font-bold transition-colors', active ? p.activeCls : cn('bg-background', p.cls))}>
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

      {/* My tasks */}
      <Card className="border shadow-sm border-primary/30">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" />המשימות שלי</CardTitle>
          <CardDescription>{myOpen.length > 0 ? `${myOpen.length} משימות פתוחות שהוקצו לך` : 'אין משימות פתוחות'}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {myOpen.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">כל הכבוד! אין משימות פתוחות 🎉</div>
          ) : (
            myOpen.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </CardContent>
      </Card>

      {/* Assigned-by-me completed */}
      {assignedByMeDone.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800"><CheckCircle className="h-5 w-5" />משימות שהקצית — בוצעו</CardTitle>
            <CardDescription className="text-green-800">{assignedByMeDone.length} משימות שהעברת הושלמו</CardDescription>
            <Button size="sm" variant="outline" className="rounded-full w-fit mt-2 border-green-300 text-green-900" onClick={clearDone}>
              <Trash2 className="h-3.5 w-3.5 ml-1" />{confirmClear ? 'בטוח? לחץ שוב לניקוי' : 'נקה את כל מה שבוצע'}
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {assignedByMeDone.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                <span className="text-sm line-through text-muted-foreground">{t.task}</span>
                <span className="text-[11px] text-green-700 font-bold">✓ {t.assigneeName || ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Board filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input value={boardSearch} onChange={(e) => setBoardSearch(e.target.value)} placeholder="חיפוש משימה / לקוח..." className="h-9 w-56 rounded-full pr-9" />
        </div>
        <span className="text-xs text-muted-foreground">מיון:</span>
        {([['manual', 'הסדר שלי'], ['smart', 'חכם'], ['due', 'לפי יעד'], ['priority', 'לפי עדיפות']] as [SortKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSortKey(k)} className={cn('px-3 h-8 rounded-full border text-xs font-medium', sortKey === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}>{l}</button>
        ))}
        <button onClick={() => setHideDone((v) => !v)} className={cn('px-3 h-8 rounded-full border text-xs font-medium', hideDone ? 'bg-muted text-foreground border-border/60' : 'bg-green-50 text-green-700 border-green-200')}>
          {hideDone ? 'הסתר שבוצעו' : 'מציג שבוצעו'}
        </button>
      </div>

      {/* Per-employee boards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const empAll = tasks.filter((t) => t.employeeId === emp.id && matchesSearch(t));
          const empTasks = sortTasks(hideDone ? empAll.filter((t) => statusOf(t) !== 'done') : empAll);
          const pendingCount = empAll.filter((t) => statusOf(t) !== 'done').length;
          const overdueEmp = empAll.filter((t) => isOverdue(t)).length;
          const isMe = me?.id === emp.id;
          return (
            <Card key={emp.id} className={cn('border shadow-sm bg-card/50', isMe ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}>
              <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" />{emp.name}
                    {isMe && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">אני</span>}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 flex items-center gap-2">
                    <span>{pendingCount > 0 ? `${pendingCount} פתוחות` : 'אין פתוחות'}</span>
                    {overdueEmp > 0 && <span className="text-red-600 font-bold">· {overdueEmp} באיחור</span>}
                  </CardDescription>
                </div>
                {pendingCount > 0 && <Bell className={cn('h-4 w-4', overdueEmp > 0 ? 'text-red-500 animate-pulse' : 'text-primary')} />}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {empTasks.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">{empAll.length === 0 ? 'אין משימות לעובד זה' : 'אין משימות תואמות'}</div>
                ) : (
                  empTasks.map((task) => <TaskRow key={task.id} task={task} />)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reassign dialog */}
      <Sheet open={!!reassignFor} onOpenChange={(o) => !o && setReassignFor(null)}>
        <SheetContent side="left" className="w-[400px] max-w-full p-0" dir="rtl">
          <SheetHeader className="p-4 border-b bg-primary/5"><SheetTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-primary" />העברת משימה</SheetTitle></SheetHeader>
          {reassignFor && (
            <div className="p-4 space-y-4">
              <p className="text-sm bg-muted/40 rounded-lg p-3 border border-border/50">"{reassignFor.task}"</p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">למי מעבירים?</label>
                <div className="flex flex-wrap gap-2">
                  {employees.filter((e) => e.id !== reassignFor.employeeId).map((e) => (
                    <button key={e.id} onClick={() => setReassignTo(e.id)}
                      className={cn('px-4 h-10 rounded-full border text-sm font-medium transition-colors', reassignTo === e.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}>
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">סיבת ההעברה (לא חובה)</label>
                <Input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="לדוגמה: זה הלקוח שלך / אני בחופש" className="h-10 rounded-xl" />
                <p className="text-[11px] text-muted-foreground">הסיבה תישמר בהיסטוריית המשימה ותוצג למקבל.</p>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-full" onClick={() => setReassignFor(null)}>ביטול</Button>
                <Button className="rounded-full gap-2" onClick={confirmReassign}><ArrowLeftRight className="h-4 w-4" />העבר משימה</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
