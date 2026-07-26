import { Users, FileText, MessageSquare, Search, Download, CheckCircle, XCircle, Clock, Tag, StickyNote, UserCheck, TrendingUp, AlertTriangle, Send, Filter, MoreVertical, Bell, Upload, Phone, Video, Camera, Plus, Bot, FileCheck, ClipboardList, Lightbulb, Eye, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/src/services/api';
import { getDB, saveDB, logActivity } from '@/src/lib/mockData';
import { User, Document, EmployeeName } from '@/src/types';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TeamTasks } from './TeamTasks';

export function AdminDashboard({ activeTab: externalTab, onTabChange, currentUser }: { activeTab?: string; onTabChange?: (tab: string) => void; currentUser?: User | null }) {
  const [db, setDb] = useState(getDB());
  const [searchTerm, setSearchTerm] = useState('');
  const [internalTab, setInternalTab] = useState('overview');
  
  const activeTab = externalTab ? (
    externalTab === 'לוח בקרה' ? 'overview' :
    externalTab === 'לקוחות' ? 'clients' :
    externalTab === 'מסמכים' ? 'documents' :
    externalTab === 'דוחות שנתיים' ? 'annual' :
    externalTab === 'אוטומציות וסוכנים' ? 'automations' :
    externalTab === 'משימות צוות' ? 'tasks' :
    externalTab === 'ניהול ידע' ? 'kb' :
    externalTab === 'פניות וצ\'אט' ? 'messages' :
    externalTab === 'יומן פעילות' ? 'activity' :
    externalTab === 'מעקב דדליינים' ? 'deadlines' :
    externalTab === 'הגדרות' ? 'settings' : 'overview'
  ) : internalTab;

  const handleTabChange = (val: string) => {
    if (onTabChange) {
      const label = 
        val === 'overview' ? 'לוח בקרה' :
        val === 'clients' ? 'לקוחות' :
        val === 'documents' ? 'מסמכים' :
        val === 'annual' ? 'דוחות שנתיים' :
        val === 'automations' ? 'אוטומציות וסוכנים' :
        val === 'tasks' ? 'משימות צוות' :
        val === 'kb' ? 'ניהול ידע' :
        val === 'messages' ? 'פניות וצ\'אט' :
        val === 'activity' ? 'יומן פעילות' :
        val === 'deadlines' ? 'מעקב דדליינים' :
        val === 'settings' ? 'הגדרות' : 'לוח בקרה';
      onTabChange(label);
    } else {
      setInternalTab(val);
    }
  };
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    clientNumber: '',
    companyId: '',
    personalCode: '',
  });

  const [newDeadline, setNewDeadline] = useState({ title: '', date: '', clientName: '', note: '' });

  const refreshData = () => {
    setDb(getDB());
  };

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const count = await api.sendAutomatedReminders();
      setAlertMessage(`נשלחו ${count} תזכורות אוטומטית ללקוחות עם מסמכים חסרים.`);
      refreshData();
    } catch (error) {
      console.error('Failed to send reminders:', error);
      setAlertMessage('אירעה שגיאה בשליחת התזכורות. אנא נסה שוב.');
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleBatchApprove = () => {
    const pendingCount = db.documents.filter(d => d.status === 'pending').length;
    if (pendingCount === 0) {
      setAlertMessage('אין מסמכים ממתינים לאישור.');
      return;
    }
    
    setConfirmDialog({
      message: `האם אתה בטוח שברצונך לאשר את כל ${pendingCount} המסמכים הממתינים?`,
      onConfirm: () => {
        const newDb = { ...db };
        newDb.documents.forEach(doc => {
          if (doc.status === 'pending') doc.status = 'approved';
        });
        setDb(newDb);
        saveDB(newDb);
        refreshData();
        setAlertMessage('כל המסמכים הממתינים אושרו בהצלחה.');
      }
    });
  };

  const handleUpdateAnnualStatus = async (userId: string, status: User['annualReportStatus']) => {
    await api.updateAnnualReportStatus(userId, status);
    refreshData();
  };

  const updateDocStatus = (docId: string, status: Document['status'], category?: Document['category']) => {
    const newDb = { ...db };
    const doc = newDb.documents.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      if (category) doc.category = category;
      setDb(newDb);
      saveDB(newDb);
      refreshData();
    }
  };

  const updateUserNotes = (userId: string, notes: string) => {
    const newDb = { ...db };
    const user = newDb.users.find(u => u.id === userId);
    if (user) {
      user.internalNotes = notes;
      setDb(newDb);
      saveDB(newDb);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) {
      setAlertMessage('נא למלא שם ואימייל');
      return;
    }

    try {
      await api.createUser({
        ...newClient,
        role: 'client',
        status: 'active',
      });
      setIsAddingClient(false);
      logActivity('הוסיף לקוח', newClient.name);
      setNewClient({ name: '', email: '', clientNumber: '', companyId: '', personalCode: '' });
      refreshData();
      setAlertMessage('לקוח חדש נוסף בהצלחה!');
    } catch (error) {
      console.error('Failed to create client:', error);
      setAlertMessage('אירעה שגיאה ביצירת הלקוח. אנא נסה שוב.');
    }
  };

  const updateAssignedEmployee = (userId: string, employee: EmployeeName) => {
    const newDb = { ...db };
    const user = newDb.users.find(u => u.id === userId);
    if (user) {
      user.assignedEmployee = employee;
      setDb(newDb);
      saveDB(newDb);
      refreshData();
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleApproveUser = async (userId: string) => {
    const newDb = { ...db };
    const user = newDb.users.find(u => u.id === userId);
    if (user) {
      user.status = 'active';
      setDb(newDb);
      saveDB(newDb);
      logActivity('אישר לקוח', user.name);
      refreshData();
      setAlertMessage(`הלקוח ${user.name} אושר בהצלחה.`);
    }
  };

  const filteredUsers = db.users.filter(u => 
    u.role === 'client' && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingUsers = db.users.filter(u => u.role === 'client' && u.status === 'pending');
  const pendingDocs = db.documents.filter(d => d.status === 'pending');
  const unreadMessages = db.messages.filter(m => !m.isRead);

  // Personalized data for the logged-in staff member (dashboard hub).
  const myEmployee = (db.employees || []).find(e =>
    (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (currentUser?.name && e.name === currentUser.name)
  );
  const firstName = (currentUser?.name || '').split(' ')[0] || 'שלום';
  const allTasks = db.teamTasks || [];
  const myOpenTasks = allTasks.filter(t => myEmployee && t.employeeId === myEmployee.id && !t.isDone);
  const completedIAssigned = allTasks.filter(t => t.assignedByName === currentUser?.name && t.isDone);

  // Build a WhatsApp reminder link for a client's missing documents.
  const openWhatsAppReminder = (u: any, kind: 'annual' | 'ongoing') => {
    if (!u.phone) { setAlertMessage('לא הוזן מספר טלפון ללקוח זה.'); return; }
    let items: string[] = [];
    if (kind === 'annual') {
      const d = u.annualReportDocs || {};
      if (d.form106 === 'חסר') items.push('טופס 106');
      if (d.form106Spouse === 'חסר') items.push('טופס 106 בן/ת זוג');
      if (d.studyFund === 'חסר') items.push('אישורי קרן השתלמות');
      if (d.form867 === 'חסר') items.push('טופס 867');
      if (d.allowances === 'חסר') items.push('אישורי קצבאות');
    } else {
      items = (u.missingDocuments || []).map((m: any) => m.name);
    }
    const list = items.length ? items.join(', ') : 'המסמכים החסרים';
    const purpose = kind === 'annual' ? 'הכנת הדוח השנתי' : 'הדיווח השוטף';
    const text = `שלום ${u.firstName || u.name}, חסרים לנו המסמכים הבאים לצורך ${purpose}: ${list}. נודה להשלמתם בהקדם. תודה, משרד Mas4U`;
    const phone = String(u.phone).replace(/\D/g, '');
    const waLink = `https://wa.me/972${phone.startsWith('0') ? phone.substring(1) : phone}?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
    logActivity('שלח תזכורת וואטסאפ', `${u.name} (${kind === 'annual' ? 'דוח שנתי' : 'שוטף'})`);
  };

  // Clients placed under follow-up / watch.
  const watchedClients = db.users.filter((u) => u.role === 'client' && u.isWatched);

  const toggleWatch = (userId: string) => {
    const newDb = { ...db };
    const u = newDb.users.find((x) => x.id === userId);
    if (!u) return;
    if (u.isWatched) {
      u.isWatched = false;
      u.watchReason = '';
    } else {
      const reason = window.prompt('למה הלקוח נכנס למעקב? (הערה קצרה)');
      if (reason === null) return; // cancelled
      u.isWatched = true;
      u.watchReason = reason;
    }
    setDb(newDb);
    saveDB(newDb);
    logActivity(u.isWatched ? 'סימן לקוח במעקב' : 'הסיר לקוח ממעקב', u.name);
    refreshData();
  };

  // Workload per employee (manager oversight).
  const workload = (db.employees || []).map((emp) => {
    const empTasks = allTasks.filter((t) => t.employeeId === emp.id);
    return {
      emp,
      open: empTasks.filter((t) => !t.isDone).length,
      done: empTasks.filter((t) => t.isDone).length,
      total: empTasks.length,
    };
  });
  const maxLoad = Math.max(1, ...workload.map((w) => w.total));

  // ---- Deadlines & alerts ----
  const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const buildBuiltinDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = today.getFullYear();
    const m = today.getMonth();
    // Next occurrence of the 15th (VAT / advances / withholding monthly reporting).
    let d15 = new Date(y, m, 15);
    if (d15 < today) d15 = new Date(y, m + 1, 15);
    return [
      { id: `builtin-15-${toISODate(d15)}`, title: 'דיווח מע"מ, מקדמות מס הכנסה וניכויים', date: toISODate(d15), kind: 'report' as const, builtin: true },
    ];
  };
  const daysUntil = (isoDate: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(isoDate + 'T00:00:00');
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  };
  const allDeadlines = [...buildBuiltinDeadlines(), ...((db.deadlines || []).map((d) => ({ ...d, builtin: false })))]
    .map((d) => ({ ...d, daysLeft: daysUntil(d.date) }))
    .filter((d) => d.daysLeft >= -1)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const upcomingDeadlines = allDeadlines.filter((d) => d.daysLeft <= 14);

  const addDeadline = () => {
    if (!newDeadline.title || !newDeadline.date) {
      setAlertMessage('יש למלא כותרת ותאריך לדדליין');
      return;
    }
    const dl = {
      id: `dl-${Date.now()}`,
      title: newDeadline.title,
      date: newDeadline.date,
      kind: 'custom' as const,
      clientName: newDeadline.clientName || undefined,
      note: newDeadline.note || undefined,
      createdBy: currentUser?.name,
    };
    const newDb = { ...db, deadlines: [...(db.deadlines || []), dl] };
    setDb(newDb); saveDB(newDb);
    logActivity('הוסיף דדליין', `${dl.title} (${dl.date})`);
    setNewDeadline({ title: '', date: '', clientName: '', note: '' });
    refreshData();
  };
  const deleteDeadline = (id: string) => {
    const newDb = { ...db, deadlines: (db.deadlines || []).filter((d) => d.id !== id) };
    setDb(newDb); saveDB(newDb); refreshData();
  };

  const activityLog = [...(db.activityLog || [])].reverse(); // newest first

  // Quick-access tiles for the personal dashboard hub.
  const hubTiles = [
    { key: 'clients', label: 'לקוחות', icon: Users },
    { key: 'documents', label: 'מסמכים', icon: FileText },
    { key: 'annual', label: 'דוחות שנתיים', icon: FileCheck },
    { key: 'tasks', label: 'משימות צוות', icon: ClipboardList },
    { key: 'kb', label: 'ניהול ידע', icon: Lightbulb },
    { key: 'messages', label: "פניות וצ'אט", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card p-6 rounded-xl shadow-lg border border-border max-w-sm w-full"
            >
              <h3 className="text-lg font-bold mb-2">הודעת מערכת</h3>
              <p className="text-muted-foreground mb-6">{alertMessage}</p>
              <div className="flex justify-end">
                <Button onClick={() => setAlertMessage('')}>אישור</Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card p-6 rounded-xl shadow-lg border border-border max-w-sm w-full"
            >
              <h3 className="text-lg font-bold mb-2">אישור פעולה</h3>
              <p className="text-muted-foreground mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDialog(null)}>ביטול</Button>
                <Button onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}>אישור</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">שלום {firstName} 👋</h1>
          <p className="text-muted-foreground mt-1">מרכז ניהול Mas4U — לקוחות, מסמכים ותהליכי עבודה</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full gap-2" onClick={() => setAlertMessage('מתחבר לסורק המשרדי...')} >
            <Camera className="h-4 w-4" />
            סריקה מהירה
          </Button>
          <Button variant="outline" className="rounded-full gap-2" onClick={handleSendReminders} disabled={isSendingReminders}>
            <Bell className="h-4 w-4" />
            {isSendingReminders ? 'שולח...' : 'תזכורות אוטומטיות'}
          </Button>
          <Button variant="outline" className="rounded-full gap-2" onClick={() => setAlertMessage('מייצא דוחות למערכת...')}>
            <Download className="h-4 w-4" />
            ייצוא דוחות
          </Button>
          
          <Sheet open={isAddingClient} onOpenChange={setIsAddingClient}>
            <SheetTrigger render={<Button className="rounded-full gap-2 shadow-lg" />}>
              <Users className="h-4 w-4" />
              הוספת לקוח חדש
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold text-primary">הוספת לקוח חדש למערכת</SheetTitle>
                <SheetDescription>
                  מלא את פרטי הלקוח ליצירת חשבון וגישה לפורטל.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateClient} className="space-y-6 py-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">שם מלא</Label>
                    <Input 
                      id="new-name" 
                      placeholder="ישראל ישראלי" 
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">אימייל</Label>
                    <Input 
                      id="new-email" 
                      type="email" 
                      placeholder="israel@example.com" 
                      value={newClient.email}
                      onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-number">מספר לקוח (פנימי)</Label>
                    <Input 
                      id="new-number" 
                      placeholder="1005" 
                      value={newClient.clientNumber}
                      onChange={(e) => setNewClient({...newClient, clientNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-company">ח.פ / ת.ז עוסק</Label>
                    <Input 
                      id="new-company" 
                      placeholder="512345678" 
                      value={newClient.companyId}
                      onChange={(e) => setNewClient({...newClient, companyId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-code">קוד אישי להתחברות (5 ספרות)</Label>
                    <Input 
                      id="new-code" 
                      placeholder="12345" 
                      maxLength={5}
                      value={newClient.personalCode}
                      onChange={(e) => setNewClient({...newClient, personalCode: e.target.value})}
                    />
                    <p className="text-[10px] text-muted-foreground">אם יישאר ריק, המערכת תייצר קוד אקראי.</p>
                  </div>
                </div>
                <SheetFooter>
                  <Button type="submit" className="w-full rounded-full h-12 text-lg">צור לקוח חדש</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'לקוחות פעילים', value: db.users.filter(u => u.role === 'client').length, icon: Users, color: 'text-blue-600', trend: '+12% החודש' },
          { title: 'מסמכים לבדיקה', value: pendingDocs.length, icon: FileText, color: 'text-amber-600', trend: 'זמן טיפול ממוצע: 4 שעות' },
          { title: 'פניות חדשות', value: unreadMessages.length, icon: MessageSquare, color: 'text-purple-600', trend: '3 דורשות טיפול דחוף' },
          { title: 'הכנסה צפויה', value: '₪ 142,500', icon: TrendingUp, color: 'text-green-600', trend: '+5% משנה שעברה' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-full">
            <TabsTrigger value="overview" className="rounded-full px-6">סקירה כללית</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6">תור מסמכים ({pendingDocs.length})</TabsTrigger>
            <TabsTrigger value="clients" className="rounded-full px-6">ניהול לקוחות</TabsTrigger>
            <TabsTrigger value="annual" className="rounded-full px-6">דוחות שנתיים</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-full px-6">פניות וצ'אט</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full px-6">משימות צוות</TabsTrigger>
            <TabsTrigger value="kb" className="rounded-full px-6">ניהול ידע</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full px-6">הגדרות</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full max-w-xs">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש מהיר..."
              className="pr-10 rounded-full bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Personal hub — quick access to everything */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {hubTiles.map((tile) => (
              <button
                key={tile.key}
                onClick={() => handleTabChange(tile.key)}
                className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <tile.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">{tile.label}</span>
              </button>
            ))}
          </div>

          {/* My work: open tasks + tasks I assigned that were completed */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />המשימות שלי</CardTitle>
                  <CardDescription>{myOpenTasks.length > 0 ? `${myOpenTasks.length} משימות פתוחות` : 'אין משימות פתוחות'}</CardDescription>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-primary" onClick={() => handleTabChange('tasks')}>לכל המשימות</Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {myOpenTasks.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">כל הכבוד! אין משימות פתוחות כרגע 🎉</div>
                ) : (
                  myOpenTasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/10">
                      <span className="text-sm font-medium">{t.task}</span>
                      <span className={cn('text-[10px] font-bold', t.priority === 'high' ? 'text-red-500' : t.priority === 'medium' ? 'text-orange-500' : 'text-blue-500')}>
                        {t.priority === 'high' ? 'דחוף' : t.priority === 'medium' ? 'רגיל' : 'נמוך'}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="bg-green-50 border-b border-green-100">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800"><CheckCircle className="h-5 w-5" />משימות שהקצית — בוצעו</CardTitle>
                <CardDescription className="text-green-700/80">{completedIAssigned.length > 0 ? `${completedIAssigned.length} משימות שהעברת הושלמו` : 'אין עדיין משימות שבוצעו'}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {completedIAssigned.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">משימות שתעביר לעובדים יופיעו כאן כשיסמנו שביצעו</div>
                ) : (
                  completedIAssigned.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                      <span className="text-sm font-medium line-through text-muted-foreground">{t.task}</span>
                      <span className="text-[10px] text-green-700 font-bold">✓ {t.assigneeName || ''}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manager oversight + clients under watch */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />עומס עבודה לפי עובד</CardTitle>
                <CardDescription>מבט מנהל: משימות פתוחות והושלמו לכל איש צוות</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {workload.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">אין עובדים להצגה</div>
                ) : (
                  workload.map(({ emp, open, done, total }) => (
                    <div key={emp.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">
                          <b className="text-primary">{open}</b> פתוחות · <b className="text-green-600">{done}</b> הושלמו
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-primary" style={{ width: `${(open / maxLoad) * 100}%` }} />
                        <div className="h-full bg-green-500/70" style={{ width: `${(done / maxLoad) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="bg-amber-50 border-b border-amber-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-800"><Eye className="h-5 w-5" />לקוחות במעקב</CardTitle>
                  <CardDescription className="text-amber-700/80">{watchedClients.length > 0 ? `${watchedClients.length} לקוחות דורשים תשומת לב` : 'אין לקוחות במעקב'}</CardDescription>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-amber-800" onClick={() => handleTabChange('clients')}>לניהול לקוחות</Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {watchedClients.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">סמן לקוח במעקב במסך "ניהול לקוחות" כדי לעקוב אחריו כאן</div>
                ) : (
                  watchedClients.map((u) => (
                    <div key={u.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Eye className="h-3.5 w-3.5 text-amber-600" />
                        {u.name}
                        {u.clientNumber && <span className="text-[10px] text-muted-foreground">#{u.clientNumber}</span>}
                      </div>
                      {u.watchReason && <p className="text-xs text-muted-foreground mt-1 pr-5">{u.watchReason}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming deadlines alert */}
          {upcomingDeadlines.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />דדליינים קרובים</CardTitle>
                  <CardDescription>מועדים ב-14 הימים הקרובים</CardDescription>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-primary" onClick={() => handleTabChange('deadlines')}>לכל הדדליינים</Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingDeadlines.slice(0, 6).map((d: any) => {
                    const urgent = d.daysLeft <= 5;
                    return (
                      <div key={d.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}>
                        <div className={cn('h-9 w-9 rounded-lg flex flex-col items-center justify-center text-white shrink-0', urgent ? 'bg-red-500' : 'bg-amber-500')}>
                          <span className="text-xs font-bold leading-none">{d.daysLeft}</span>
                          <span className="text-[8px]">ימים</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{d.title}</p>
                          {d.clientName && <p className="text-[10px] text-muted-foreground truncate">{d.clientName}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {pendingUsers.length > 0 && (
            <Card className="border-amber-200 shadow-sm bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  בקשות הרשמה ממתינות לאישור ({pendingUsers.length})
                </CardTitle>
                <CardDescription className="text-amber-700/80">
                  לקוחות חדשים שנרשמו דרך האתר וממתינים לאישור מנהל כדי לקבל גישה למערכת.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 shadow-sm">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email} | {user.phone || 'ללא טלפון'} | {user.idNumber || 'ללא ת.ז'}</p>
                        <p className="text-xs text-muted-foreground">עיסוק: {user.occupation || 'לא צוין'} | סוג: {user.dealerType || 'לא צוין'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveUser(user.id)}>
                          <CheckCircle className="h-4 w-4 ml-1" />
                          אשר לקוח
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>לקוחות בסיכון (חסרי מסמכים)</CardTitle>
                    <CardDescription>לקוחות שלא העלו מסמכים לקראת מועדי הדיווח הקרובים</CardDescription>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">דחוף</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">לקוח</TableHead>
                      <TableHead className="text-right">דיווח קרוב</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-left">פעולה</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 4).map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-bold">{user.name}</TableCell>
                        <TableCell>מע"מ (15/04)</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-destructive text-xs font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            חסרים 3 מסמכים
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-primary gap-2" onClick={() => openWhatsAppReminder(user, 'ongoing')}>
                            <Send className="h-3 w-3" />
                            שלח תזכורת
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle>משימות להיום</CardTitle>
                <CardDescription>ניהול פנימי של המשרד</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {[
                  { task: 'בדיקת דוחות שנתיים - סניף ת"א', done: true },
                  { task: 'שיחת עדכון עם ישראל ישראלי', done: false },
                  { task: 'הפקת אישורי ניכוי מס במקור', done: false },
                  { task: 'מענה לפניות WhatsApp חדשות', done: false },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      t.done ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                    )}>
                      {t.done && <CheckCircle className="h-3 w-3" />}
                    </div>
                    <span className={cn("text-sm font-medium", t.done && "line-through opacity-50")}>{t.task}</span>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-full mt-4">הוספת משימה</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>תור אישור מסמכים</CardTitle>
                  <CardDescription>סיווג, אישור או דחייה של מסמכים שהועלו על ידי לקוחות</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleBatchApprove}>
                    <CheckCircle className="h-3 w-3" />
                    אישור גורף (Batch)
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                    <Filter className="h-3 w-3" />
                    סינון
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מסמך</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">סיווג</TableHead>
                    <TableHead className="text-right">תאריך העלאה</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.documents.slice().reverse().map((doc) => {
                    const owner = db.users.find(u => u.id === doc.userId);
                    return (
                      <TableRow key={doc.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-bold">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{owner?.name}</span>
                            {owner?.clientNumber && <span className="text-[10px] text-muted-foreground">#{owner.clientNumber}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={doc.category} 
                            onValueChange={(val) => updateDocStatus(doc.id, doc.status, val as any)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs rounded-full">
                              <SelectValue placeholder="סיווג" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="דוח שנתי">דוח שנתי</SelectItem>
                              <SelectItem value="אישור מס">אישור מס</SelectItem>
                              <SelectItem value="הוצאה">הוצאה</SelectItem>
                              <SelectItem value="הכנסה">הכנסה</SelectItem>
                              <SelectItem value="שכר">שכר</SelectItem>
                              <SelectItem value="כפילות">כפילות</SelectItem>
                              <SelectItem value="אחר">אחר</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{doc.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-green-600 h-8 w-8 hover:bg-green-50"
                              onClick={() => updateDocStatus(doc.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600 h-8 w-8 hover:bg-red-50"
                              onClick={() => updateDocStatus(doc.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAlertMessage(`מוריד קובץ: ${doc.name}`)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>מעקב דוחות שנתיים</CardTitle>
                  <CardDescription>ניהול ומעקב אחר איסוף מסמכים לדוח השנתי</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="חיפוש לפי שם..."
                      className="pr-10 rounded-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead className="text-right font-bold w-[100px]">ח.פ/ת.ז</TableHead>
                    <TableHead className="text-right font-bold w-[100px]">שם פרטי</TableHead>
                    <TableHead className="text-right font-bold w-[100px]">שם משפחה</TableHead>
                    <TableHead className="text-right font-bold w-[120px]">מס' טלפון</TableHead>
                    <TableHead className="text-right font-bold w-[100px]">עיסוק</TableHead>
                    <TableHead className="text-center font-bold w-[80px]">106</TableHead>
                    <TableHead className="text-center font-bold w-[80px]">106 בן/ת זוג</TableHead>
                    <TableHead className="text-center font-bold w-[80px]">קרן השתלמות</TableHead>
                    <TableHead className="text-center font-bold w-[80px]">טופס 867</TableHead>
                    <TableHead className="text-center font-bold w-[80px]">קצבאות</TableHead>
                    <TableHead className="text-right font-bold min-w-[150px]">הערות</TableHead>
                    <TableHead className="text-center font-bold w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredUsers].sort((a, b) => (a.lastName || a.name).localeCompare(b.lastName || b.name, 'he')).map((user) => {
                    const docs = user.annualReportDocs || {};
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'יש': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
                        case 'חסר': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
                        case 'בתהליך': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
                        case 'אין': return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
                        default: return 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100';
                      }
                    };

                    const StatusBadge = ({ field, value }: { field: keyof NonNullable<User['annualReportDocs']>, value: string }) => (
                      <Select 
                        value={value || 'אין'} 
                        onValueChange={async (val) => {
                          await api.updateAnnualReportDocs(user.id, { [field]: val } as any);
                          refreshData();
                        }}
                      >
                        <SelectTrigger className={cn("h-7 text-[10px] font-bold border rounded-md px-2", getStatusColor(value || 'אין'))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="יש">יש</SelectItem>
                          <SelectItem value="חסר">חסר</SelectItem>
                          <SelectItem value="בתהליך">בתהליך</SelectItem>
                          <SelectItem value="אין">אין</SelectItem>
                        </SelectContent>
                      </Select>
                    );

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs border-l border-border/50">{user.idNumber || user.companyId || '---'}</TableCell>
                        <TableCell className="text-xs font-medium border-l border-border/50">{user.firstName || user.name.split(' ')[0]}</TableCell>
                        <TableCell className="text-xs font-bold border-l border-border/50">{user.lastName || user.name.split(' ').slice(1).join(' ')}</TableCell>
                        <TableCell className="text-xs border-l border-border/50" dir="ltr">{user.phone || '---'}</TableCell>
                        <TableCell className="text-xs border-l border-border/50">{user.occupation || '---'}</TableCell>
                        <TableCell className="text-center border-l border-border/50 p-1">
                          <StatusBadge field="form106" value={docs.form106 || 'אין'} />
                        </TableCell>
                        <TableCell className="text-center border-l border-border/50 p-1">
                          <StatusBadge field="form106Spouse" value={docs.form106Spouse || 'אין'} />
                        </TableCell>
                        <TableCell className="text-center border-l border-border/50 p-1">
                          <StatusBadge field="studyFund" value={docs.studyFund || 'אין'} />
                        </TableCell>
                        <TableCell className="text-center border-l border-border/50 p-1">
                          <StatusBadge field="form867" value={docs.form867 || 'אין'} />
                        </TableCell>
                        <TableCell className="text-center border-l border-border/50 p-1">
                          <StatusBadge field="allowances" value={docs.allowances || 'אין'} />
                        </TableCell>
                        <TableCell className="border-l border-border/50 p-1">
                          <Input 
                            placeholder="הערות..."
                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent"
                            value={user.internalNotes || ''}
                            onChange={(e) => updateUserNotes(user.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center p-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                            onClick={() => {
                              if (!user.phone) {
                                setAlertMessage('לא הוזן מספר טלפון ללקוח זה.');
                                return;
                              }
                              const missing = [];
                              if (docs.form106 === 'חסר') missing.push('טופס 106');
                              if (docs.form106Spouse === 'חסר') missing.push('טופס 106 בן/ת זוג');
                              if (docs.studyFund === 'חסר') missing.push('אישורי קרן השתלמות');
                              if (docs.form867 === 'חסר') missing.push('טופס 867');
                              if (docs.allowances === 'חסר') missing.push('אישורי קצבאות');
                              
                              const text = `שלום ${user.firstName || user.name}, חסרים לנו המסמכים הבאים לצורך הכנת הדוח השנתי: ${missing.join(', ')}. נודה להשלמתם בהקדם.`;
                              const phone = user.phone.replace(/\D/g, '');
                              const waLink = `https://wa.me/972${phone.startsWith('0') ? phone.substring(1) : phone}?text=${encodeURIComponent(text)}`;
                              window.open(waLink, '_blank');
                            }}
                            title="שלח הודעת חוסרים בוואטסאפ"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle>אוטומציות וסוכנים חכמים (בקרוב)</CardTitle>
              <CardDescription>מרכז שליטה לסוכני AI, תהליכים אוטומטיים וחיבור למערכות חיצוניות</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">הכנה לאוטומציה מלאה</h3>
                <p className="text-muted-foreground">
                  המערכת נבנתה בארכיטקטורה המאפשרת חיבור קל ומהיר לסוכנים חכמים (Agents) ולתהליכי אוטומציה (כגון Make, Zapier, או סקריפטים מותאמים אישית).
                </p>
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="p-4 border rounded-xl bg-background">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> סיווג מסמכים</h4>
                    <p className="text-xs text-muted-foreground">סוכן AI שיקרא ויסווג חשבוניות באופן אוטומטי.</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-background">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> תזכורות חכמות</h4>
                    <p className="text-xs text-muted-foreground">שליחת הודעות WhatsApp אוטומטיות ללקוחות.</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-background">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> מענה אוטומטי</h4>
                    <p className="text-xs text-muted-foreground">צ'אטבוט מבוסס ידע המשרד למענה ראשוני.</p>
                  </div>
                  <div className="p-4 border rounded-xl bg-background">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> סנכרון CRM</h4>
                    <p className="text-xs text-muted-foreground">חיבור למערכות הנהלת חשבונות (שעמ, פריוריטי).</p>
                  </div>
                </div>
                <Button className="rounded-full w-full gap-2 mt-4" onClick={() => setAlertMessage('מודול האוטומציות יופעל בשלב הבא של הפיתוח.')}>
                  <Plus className="h-4 w-4" />
                  הוסף סוכן חדש
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ניהול תיקי לקוחות</CardTitle>
                  <CardDescription>שיוך עובדים, הערות פנימיות וניהול סטטוס</CardDescription>
                </div>
                {selectedUsers.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Button 
                      className="rounded-full gap-2 bg-primary shadow-lg"
                      onClick={() => setAlertMessage(`שליחת הודעה ל-${selectedUsers.length} לקוחות: ${selectedUsers.map(id => db.users.find(u => u.id === id)?.name).join(', ')}`)}
                    >
                      <Send className="h-4 w-4" />
                      שלח הודעה ל-{selectedUsers.length} לקוחות
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">שיוכים</TableHead>
                    <TableHead className="text-right">עובד מטפל</TableHead>
                    <TableHead className="text-right">הערות פנימיות</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={cn(selectedUsers.includes(user.id) && "bg-primary/5")}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell className="font-bold">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {user.isWatched && (
                              <Badge className="text-[10px] h-4 px-1 bg-amber-500 text-white gap-1">
                                <Eye className="h-2.5 w-2.5" />במעקב
                              </Badge>
                            )}
                            {user.clientNumber && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-muted text-muted-foreground">
                                #{user.clientNumber}
                              </Badge>
                            )}
                            {user.annualReportStatus && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/20 text-primary">
                                דוח שנתי: {
                                  user.annualReportStatus === 'not_started' ? 'ממתין' :
                                  user.annualReportStatus === 'collecting_docs' ? 'איסוף' :
                                  user.annualReportStatus === 'in_preparation' ? 'בהכנה' :
                                  user.annualReportStatus === 'submitted' ? 'שודר' : 'הושלם'
                                }
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="קוד זיהוי קבוע..."
                          className="h-9 w-[120px] text-sm"
                          value={user.assignmentCode || ''}
                          onChange={async (e) => {
                            await api.updateUserAssignmentCode(user.id, e.target.value);
                            refreshData();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={user.assignedEmployee} 
                          onValueChange={(val) => updateAssignedEmployee(user.id, val as EmployeeName)}
                        >
                          <SelectTrigger className="w-[140px] h-9 rounded-full">
                            <SelectValue placeholder="בחר עובד" />
                          </SelectTrigger>
                          <SelectContent>
                            {['אלמוג', 'נדיה', 'מיכל', 'דורית', 'נימרוד'].map(name => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <Textarea 
                          placeholder="הערות לשימוש פנימי..."
                          className="min-h-[60px] text-xs rounded-xl"
                          value={user.internalNotes || ''}
                          onChange={(e) => updateUserNotes(user.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`admin-upload-${user.id}`}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                api.uploadDocument(user.id, e.target.files[0], undefined, undefined, 'admin').then(() => {
                                  setAlertMessage(`המסמך הועלה בהצלחה עבור ${user.name}`);
                                  refreshData();
                                }).catch((error) => {
                                  console.error('Failed to upload document:', error);
                                  setAlertMessage('אירעה שגיאה בהעלאת המסמך.');
                                });
                              }
                            }}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full gap-2 hover:bg-primary/5"
                            onClick={() => document.getElementById(`admin-upload-${user.id}`)?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            העלאת מסמך
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => setAlertMessage(`עריכת פרטי לקוח: ${user.name}\nח.פ: 512345678\nתיק ניכויים: 912345678\nמע"מ: דו-חודשי\nמס הכנסה: חודשי\nאחראי: ${user.assignedEmployee}`)}>
                            <UserCheck className="h-4 w-4" />
                            תיק לקוח
                          </Button>
                          <Button
                            variant={user.isWatched ? 'default' : 'outline'}
                            size="sm"
                            className={cn('rounded-full gap-2', user.isWatched && 'bg-amber-500 hover:bg-amber-600 text-white')}
                            onClick={() => toggleWatch(user.id)}
                            title={user.isWatched ? 'הסר ממעקב' : 'הוסף למעקב'}
                          >
                            <Eye className="h-4 w-4" />
                            {user.isWatched ? 'במעקב' : 'מעקב'}
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1 border-none shadow-sm h-[600px] flex flex-col">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg">שיחות אחרונות</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {db.users.filter(u => u.role === 'client').map(client => (
                  <div key={client.id} className="p-4 border-b hover:bg-primary/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://picsum.photos/seed/${client.email}/200`} />
                        <AvatarFallback>{client.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{client.name}</span>
                          <span className="text-[10px] text-muted-foreground">12:45</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">היי, העליתי את המסמכים שביקשת...</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 border-none shadow-sm h-[600px] flex flex-col">
              <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://picsum.photos/seed/israel@example.com/200`} />
                    <AvatarFallback>יי</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">ישראל ישראלי</CardTitle>
                    <CardDescription>מחובר כעת</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full"><Phone className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-full"><Video className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm">
                    שלום ישראל, מה שלומך? ראיתי שהעלית את המסמכים, אני עובר עליהם עכשיו.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-primary text-white p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                    מעולה תודה! יש משהו נוסף שחסר?
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Input placeholder="הקלד הודעה..." className="rounded-full" />
                  <Button className="rounded-full h-10 w-10 p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TeamTasks db={db} setDb={(newDb) => { setDb(newDb); saveDB(newDb); }} saveDB={saveDB} currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="kb">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle>ניהול מרכז ידע וזכויות</CardTitle>
                <CardDescription>עריכת מאמרים, הוספת טיפים ועדכונים ללקוחות</CardDescription>
              </div>
              <Button className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                מאמר חדש
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">כותרת המאמר</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">תאריך עדכון</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.knowledgeBase.map(article => (
                    <TableRow key={article.id}>
                      <TableCell className="font-bold">{article.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{article.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">10/04/2024</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">ערוך</Button>
                          <Button variant="ghost" size="sm" className="text-destructive">מחק</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle>הגדרות משרד</CardTitle>
              <CardDescription>ניהול פרטי המשרד, עובדים והרשאות</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">שם המשרד</label>
                  <Input defaultValue="Mas4U - ייעוץ מס וחשבונאות" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">אימייל משרדי</label>
                  <Input defaultValue="office@mas4u.co.il" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">עובדי המשרד</label>
                <div className="flex flex-wrap gap-2">
                  {['אלמוג', 'נדיה', 'מיכל', 'דורית', 'נימרוד'].map(name => (
                    <Badge key={name} variant="secondary" className="px-3 py-1 rounded-full text-sm">
                      {name}
                    </Badge>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-full">+</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity log */}
        <TabsContent value="activity">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />יומן פעילות</CardTitle>
              <CardDescription>תיעוד אוטומטי של פעולות במערכת — מי עשה מה ומתי</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {activityLog.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10">עדיין אין פעילות מתועדת</div>
              ) : (
                <div className="space-y-2">
                  {activityLog.slice(0, 100).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                        {(a.actor || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <b>{a.actor}</b> — {a.action}
                          {a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.at).toLocaleString('he-IL')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines */}
        <TabsContent value="deadlines" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />מעקב דדליינים</CardTitle>
              <CardDescription>מועדי דיווח, פקיעת ניכוי במקור ותזכורות מותאמות אישית</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end pb-2 border-b">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">כותרת</label>
                  <Input value={newDeadline.title} onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })} placeholder="לדוגמה: פקיעת ניכוי במקור - חברת א.ב.ג" className="h-10 rounded-full" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">תאריך</label>
                  <Input type="date" value={newDeadline.date} onChange={(e) => setNewDeadline({ ...newDeadline, date: e.target.value })} className="h-10 rounded-full" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">לקוח (אופציונלי)</label>
                  <Input value={newDeadline.clientName} onChange={(e) => setNewDeadline({ ...newDeadline, clientName: e.target.value })} placeholder="שם לקוח" className="h-10 rounded-full" />
                </div>
                <Button onClick={addDeadline} className="h-10 rounded-full gap-2"><Plus className="h-4 w-4" />הוסף</Button>
              </div>

              {allDeadlines.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">אין דדליינים קרובים</div>
              ) : (
                <div className="space-y-2">
                  {allDeadlines.map((d: any) => {
                    const urgent = d.daysLeft <= 5;
                    const soon = d.daysLeft <= 14;
                    return (
                      <div key={d.id} className={cn('flex items-center justify-between gap-3 p-3 rounded-xl border', urgent ? 'bg-red-50 border-red-200' : soon ? 'bg-amber-50 border-amber-200' : 'bg-background border-border/50')}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('h-10 w-10 rounded-xl flex flex-col items-center justify-center text-white shrink-0', urgent ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-primary')}>
                            <span className="text-sm font-bold leading-none">{d.daysLeft < 0 ? '!' : d.daysLeft}</span>
                            <span className="text-[8px]">{d.daysLeft < 0 ? 'עבר' : 'ימים'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{d.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(d.date + 'T00:00:00').toLocaleDateString('he-IL')}
                              {d.clientName && ` · ${d.clientName}`}
                              {d.builtin && ' · מועד קבוע'}
                            </p>
                          </div>
                        </div>
                        {!d.builtin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => deleteDeadline(d.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
