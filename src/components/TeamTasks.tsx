import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Plus, Trash2, User as UserIcon, Shield, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee, TeamTask, DB } from '@/src/types';
import { toast } from 'sonner';

interface TeamTasksProps {
  db: DB;
  setDb: (db: DB) => void;
  saveDB: (db: DB) => void;
}

export function TeamTasks({ db, setDb, saveDB }: TeamTasksProps) {
  const [currentUserMode, setCurrentUserMode] = useState<string>('manager');
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high'|'medium'|'low'>('medium');
  const [selectedEmployeeForNewTask, setSelectedEmployeeForNewTask] = useState<string>('');

  const employees = db.employees || [];
  const tasks = db.teamTasks || [];

  const handleAddTask = () => {
    if (!newTask || !selectedEmployeeForNewTask) {
      toast.error('יש לבחור עובד ולהזין תיאור משימה');
      return;
    }

    const newTaskObj: TeamTask = {
      id: `task-${Date.now()}`,
      employeeId: selectedEmployeeForNewTask,
      task: newTask,
      priority: newTaskPriority,
      isDone: false,
      createdAt: new Date().toISOString()
    };

    const newDb = { ...db, teamTasks: [...tasks, newTaskObj] };
    setDb(newDb);
    saveDB(newDb);
    setNewTask('');
    setNewTaskPriority('medium');
    toast.success('המשימה נוספה בהצלחה');
  };

  const toggleTaskStatus = (taskId: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
         if (!t.isDone) {
            toast.success(`המשימה "${t.task}" הושלמה! המנהל קיבל התראה.`);
         }
         return { ...t, isDone: !t.isDone };
      }
      return t;
    });

    const newDb = { ...db, teamTasks: newTasks };
    setDb(newDb);
    saveDB(newDb);
  };

  const deleteTask = (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    const newDb = { ...db, teamTasks: newTasks };
    setDb(newDb);
    saveDB(newDb);
    toast.info('המשימה נמחקה');
  };

  const handleAddEmployee = () => {
    const name = prompt('הכנס שם עובד חדש:');
    if (name) {
      const newEmp: Employee = { id: `emp-${Date.now()}`, name, role: 'employee' };
      const newDb = { ...db, employees: [...employees, newEmp] };
      setDb(newDb);
      saveDB(newDb);
      toast.success('העובד נוסף בהצלחה');
    }
  };

  // Determine what we show based on current user mode
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">מי צופה במסך זה כעת? (לצורך סימולציה)</span>
            <Select value={currentUserMode} onValueChange={setCurrentUserMode}>
              <SelectTrigger className="w-[200px] h-9 text-xs rounded-full bg-background">
                <SelectValue placeholder="בחר משתמש..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-primary" />
                    <span>מנהל המשרד</span>
                  </div>
                </SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                      <span>{emp.name} (עובד/ת)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentUserMode === 'manager' && (
            <Button size="sm" variant="outline" className="rounded-full gap-2 border-primary/20 bg-background" onClick={handleAddEmployee}>
              <Plus className="h-4 w-4" />
              הוסף איש צוות
            </Button>
          )}
        </CardContent>
      </Card>

      {currentUserMode === 'manager' && (
        <Card className="border-none shadow-sm shadow-blue-100">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg text-primary">הקצאת משימה חדשה</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">עובד מבצע</label>
              <Select value={selectedEmployeeForNewTask} onValueChange={setSelectedEmployeeForNewTask}>
                <SelectTrigger className="h-10 rounded-full">
                  <SelectValue placeholder="בחר עובד..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                     <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">עדיפות</label>
              <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as 'high'|'medium'|'low')}>
                <SelectTrigger className="h-10 rounded-full">
                  <SelectValue placeholder="עדיפות..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">דחוף</SelectItem>
                  <SelectItem value="medium">רגיל</SelectItem>
                  <SelectItem value="low">עדיפות נמוכה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">תיאור המשימה</label>
              <Input 
                value={newTask} 
                onChange={(e) => setNewTask(e.target.value)} 
                placeholder="לדוגמה: הגשת דוח 856 לחברת החשמל" 
                className="h-10 rounded-full"
              />
            </div>
            <Button onClick={handleAddTask} className="h-10 rounded-full w-full gap-2">
              <Plus className="h-4 w-4" />
              הוסף משימה
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
           // If I'm an employee, only show my board
           if (currentUserMode !== 'manager' && currentUserMode !== emp.id) return null;

           const empTasks = tasks.filter(t => t.employeeId === emp.id);
           const pendingCount = empTasks.filter(t => !t.isDone).length;

           return (
             <Card key={emp.id} className="border-none shadow-sm bg-card/50">
               <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between pb-3">
                 <div>
                   <CardTitle className="text-lg flex items-center gap-2">
                     <UserIcon className="h-5 w-5 text-primary" />
                     {emp.name}
                   </CardTitle>
                   <CardDescription className="text-xs mt-1">
                     {pendingCount > 0 ? `${pendingCount} משימות פתוחות` : 'אין משימות פתוחות'}
                   </CardDescription>
                 </div>
                 {currentUserMode === 'manager' && pendingCount > 0 && (
                   <Bell className={cn("h-4 w-4", pendingCount > 3 ? "text-red-500 animate-pulse" : "text-primary")} />
                 )}
               </CardHeader>
               <CardContent className="p-4 space-y-3">
                 {empTasks.length === 0 ? (
                   <div className="text-center text-sm text-muted-foreground py-6">
                     אין משימות לעובד זה
                   </div>
                 ) : (
                   empTasks.map(task => (
                     <div key={task.id} className={cn(
                       "flex items-start justify-between p-3 rounded-xl border transition-all",
                       task.isDone ? "bg-muted/20 border-transparent opacity-60" : "bg-background border-primary/10 shadow-sm"
                     )}>
                       <div className="flex items-start gap-3">
                         <button 
                           onClick={() => toggleTaskStatus(task.id)}
                           className={cn(
                             "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5",
                             task.isDone ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-primary"
                           )}
                         >
                           {task.isDone && <CheckCircle className="h-3 w-3" />}
                         </button>
                         <div className="flex flex-col gap-1">
                           <span className={cn("text-sm font-medium", task.isDone && "line-through")}>
                             {task.task}
                           </span>
                           {!task.isDone && (
                             <span className={cn(
                               "text-[10px] uppercase font-bold tracking-wider",
                               task.priority === 'high' ? "text-red-500" : task.priority === 'medium' ? "text-orange-500" : "text-blue-500"
                             )}>
                               {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'רגיל' : 'עדיפות נמוכה'}
                             </span>
                           )}
                         </div>
                       </div>
                       {currentUserMode === 'manager' && (
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => deleteTask(task.id)}>
                           <Trash2 className="h-3 w-3" />
                         </Button>
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
