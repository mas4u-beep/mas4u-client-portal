import { Clock, MessageCircle, FileText, Badge as BadgeIcon, AlertCircle, Bell, Search, Lightbulb, Camera, X, Upload, CheckCircle2, Calendar, CheckCircle, Loader2, AlertTriangle, ChevronLeft, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/src/services/api';
import { DocumentScanner } from './DocumentScanner';
import { DigitalSignature } from './DigitalSignature';
import { TaxHealth } from './TaxHealth';
import { Scheduling } from './Scheduling';
import { KnowledgeBase } from './KnowledgeBase';
import { Community } from './Community';
import React, { useState, useCallback } from 'react';
import { StatusStep, User, Document } from '@/src/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Info } from 'lucide-react';

const pnlData = [
  { name: 'ינואר', הכנסות: 45000, הוצאות: 32000 },
  { name: 'פברואר', הכנסות: 52000, הוצאות: 34000 },
  { name: 'מרץ', הכנסות: 48000, הוצאות: 31000 },
  { name: 'אפריל', הכנסות: 61000, הוצאות: 38000 },
];

const statusSteps: StatusStep[] = [
  { id: 1, label: 'קליטת מסמכים', description: 'המסמכים התקבלו ונמצאים בבדיקה ראשונית', isCompleted: true, isCurrent: false },
  { id: 2, label: 'בדיקת זכאות', description: 'חישוב החזר המס המקסימלי עבורך', isCompleted: false, isCurrent: true },
  { id: 3, label: 'הגשה לרשות המיסים', description: 'שידור הדוח למערכות מס הכנסה', isCompleted: false, isCurrent: false },
  { id: 4, label: 'קבלת החזר', description: 'העברת הכספים לחשבון הבנק', isCompleted: false, isCurrent: false },
];

export function Dashboard({ user, onTabChange }: { user: any; onTabChange?: (tab: string) => void }) {
  const [showScanner, setShowScanner] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPurpose, setUploadPurpose] = useState<Document['purpose']>('מסמכים שוטפים');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Use state for data to allow re-renders on updates
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userTimeline, setUserTimeline] = useState<any[]>([]);
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);

  React.useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      try {
        const [notifs, timeline, docs, knowledge] = await Promise.all([
          api.getNotifications(user.id),
          api.getTimeline(user.id),
          api.getDocuments(user.id),
          api.getKnowledgeBase()
        ]);
        if (isCancelled) return;
        setNotifications(notifs);
        setUserTimeline(timeline);
        setUserDocs(docs);
        setKnowledgeBase(knowledge);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadData();
    return () => { isCancelled = true; };
  }, [user.id]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccessMessage(null);
    const fileList = Array.from(files);

    try {
      for (const file of fileList) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        await api.uploadDocument(user.id, file, uploadPurpose, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });

        // Refresh data after each upload
        const [timeline, docs] = await Promise.all([
          api.getTimeline(user.id),
          api.getDocuments(user.id)
        ]);
        setUserTimeline(timeline);
        setUserDocs(docs);
      }

      setUploadSuccessMessage(`המסמכים הועלו בהצלחה עבור: ${uploadPurpose}`);
    } catch (error) {
      console.error('Failed to upload documents:', error);
      setUploadSuccessMessage('אירעה שגיאה בהעלאת המסמכים. אנא נסה שוב.');
    } finally {
      setUploadProgress({});
      setIsUploading(false);
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [user.id, uploadPurpose]);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full relative">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary">היי {user?.name?.split(' ')[0]}, הנה הדוחות שלך</h1>
            {user.clientNumber && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-mono text-sm bg-primary/10 text-primary border-primary/20">
                לקוח #{user.clientNumber}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              עדכון אחרון: היום, 15:30
            </p>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                      {unreadCount}
                    </span>
                  )}
                  התראות
                </DropdownMenuTrigger>
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
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-end gap-2"
        >
          <div className="flex items-center gap-2 text-sm font-medium bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <span className="text-muted-foreground">מטפל/ת בתיק:</span>
            <span className="text-primary font-bold">{user?.assignedEmployee || 'צוות Mas4U'}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-full border-primary/20 hover:bg-primary/5"
              onClick={() => setShowScheduling(true)}
            >
              <Calendar className="h-4 w-4" />
              תיאום פגישה
            </Button>
            <Button
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-xl transition-all h-12 px-6 rounded-full"
              nativeButton={false}
              render={
                <a 
                  href={`https://wa.me/972523512718?text=${encodeURIComponent(`שלום ${user?.assignedEmployee || ''}, אני פונה בנוגע לתיק שלי ב-Mas4U`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-5 w-5" />
                  צרו קשר ב-WhatsApp
                </a>
              }
            />
          </div>
        </motion.div>
      </header>

      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-xl">
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="icon" onClick={() => setShowScanner(false)} className="bg-white shadow-md rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <DocumentScanner onScanComplete={(cat) => console.log('Scanned:', cat)} />
            </div>
          </motion.div>
        )}

        {showSignature && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <DigitalSignature 
              onSave={(sig) => { console.log('Signed:', sig); setShowSignature(false); }}
              onCancel={() => setShowSignature(false)}
            />
          </motion.div>
        )}

        {showScheduling && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-2xl">
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="icon" onClick={() => setShowScheduling(false)} className="bg-white shadow-md rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <Scheduling onSchedule={(d, t, type) => { console.log('Scheduled:', d, t, type); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <TaxHealth score={user?.taxHealthScore || 85} missingDocumentsCount={user?.missingDocuments?.length || 0} />
        
        <AnimatePresence>
          {user?.missingDocuments && user.missingDocuments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="md:col-span-2 lg:col-span-3"
            >
              <Card className="border-destructive/20 bg-destructive/5 shadow-lg overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
                  </div>
                  <div className="flex-1 text-center md:text-right">
                    <h3 className="text-xl font-black text-destructive">שים לב! חסרים מסמכים לדיווח הקרוב</h3>
                    <p className="text-muted-foreground">יש להעלות את המסמכים הבאים עד ה-{user.missingDocuments[0].deadline} כדי להימנע מקנסות.</p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                      {user.missingDocuments.map((doc: any) => (
                        <Badge key={doc.id} variant="outline" className="bg-background/50 border-destructive/20 text-destructive font-bold py-1 px-3">
                          {doc.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="rounded-full bg-destructive hover:bg-destructive/90 text-white px-8 h-12 font-bold shadow-lg shadow-destructive/20"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    העלה עכשיו
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {user?.annualReportStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 lg:col-span-4"
            >
              <Card className="border-none shadow-sm bg-card/50 backdrop-blur overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    סטטוס דוח שנתי 2023
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative flex justify-between items-center max-w-4xl mx-auto">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 z-0"></div>
                    {[
                      { id: 'not_started', label: 'טרם החל' },
                      { id: 'collecting_docs', label: 'איסוף מסמכים' },
                      { id: 'in_preparation', label: 'בהכנה' },
                      { id: 'submitted', label: 'שודר' },
                      { id: 'completed', label: 'הסתיים' }
                    ].map((step, index) => {
                      const statuses = ['not_started', 'collecting_docs', 'in_preparation', 'submitted', 'completed'];
                      const currentIdx = statuses.indexOf(user.annualReportStatus || 'not_started');
                      const isCompleted = index <= currentIdx;
                      const isCurrent = index === currentIdx;

                      return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border-4 transition-all duration-500",
                            isCompleted ? "bg-primary border-primary text-white" : "bg-background border-muted text-muted-foreground",
                            isCurrent && "ring-4 ring-primary/20 scale-110"
                          )}>
                            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                          </div>
                          <span className={cn(
                            "text-xs font-bold whitespace-nowrap",
                            isCurrent ? "text-primary" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 lg:col-span-4"
          >
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      מגמות רווח והפסד
                    </CardTitle>
                    <CardDescription>סקירה רבעונית של הכנסות מול הוצאות</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    2024 - רבעון 1
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pnlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => `₪${value / 1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="הכנסות" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="הוצאות" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorExpense)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {[
          { title: 'סטטוס בקשה', value: 'בטיפול', sub: 'הוגש לפני 12 ימים', icon: Clock, color: 'text-primary' },
          { title: 'מסמכים חסרים', value: '0', sub: 'הכל מעודכן', icon: AlertCircle, color: 'text-primary' },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.div
          className="lg:col-span-2 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-none shadow-sm overflow-hidden bg-primary/5">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-primary">העלאת מסמכים חדשים</CardTitle>
                <CardDescription className="text-base mt-2">
                  עבור לעמוד העלאת המסמכים כדי להעלות קבצים מרובים ולהשתמש בסריקה חכמה.
                </CardDescription>
              </div>
              <Button 
                className="rounded-full h-12 px-8 font-bold shadow-lg"
                onClick={() => onTabChange && onTabChange('העלאת מסמכים')}
              >
                למסך העלאת מסמכים
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                ארכיון מסמכים אישי (חודש נוכחי)
              </CardTitle>
              <CardDescription>מסמכים שהעלית החודש. מסמכים מחודשים קודמים ננעלים לעריכה.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">שם המסמך</th>
                      <th className="p-4 font-medium">תאריך העלאה</th>
                      <th className="p-4 font-medium">מטרה</th>
                      <th className="p-4 font-medium">סטטוס</th>
                      <th className="p-4 font-medium text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userDocs.filter(doc => {
                      const docDate = new Date(doc.uploadDate || doc.date);
                      const now = new Date();
                      return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
                    }).map(doc => (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium">{doc.name}</td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(doc.uploadDate || doc.date).toLocaleDateString('he-IL')}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-primary/5">
                            {doc.purpose || 'כללי'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {doc.status === 'pending' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">ממתין לאישור</Badge>}
                          {doc.status === 'approved' && <Badge variant="secondary" className="bg-green-100 text-green-800">אושר</Badge>}
                          {doc.status === 'rejected' && <Badge variant="secondary" className="bg-red-100 text-red-800">נדחה</Badge>}
                          {doc.status === 'duplicate' && <Badge variant="secondary" className="bg-orange-100 text-orange-800">כפילות</Badge>}
                          {doc.status === 'unrecognized' && <Badge variant="secondary" className="bg-gray-100 text-gray-800">הוצאה לא מוכרת</Badge>}
                        </td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">צפייה</Button>
                        </td>
                      </tr>
                    ))}
                    {userDocs.filter(doc => {
                      const docDate = new Date(doc.uploadDate || doc.date);
                      const now = new Date();
                      return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          לא הועלו מסמכים החודש.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                תיקיות משרד (ארכיון)
              </CardTitle>
              <CardDescription>מסמכים שהופקו על ידי המשרד עבורך</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5" onClick={() => onTabChange && onTabChange('ארכיון מסמכים')}>
                  <FileText className="h-8 w-8 text-primary" />
                  <span>דוחות שנתיים</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5" onClick={() => onTabChange && onTabChange('ארכיון מסמכים')}>
                  <FileText className="h-8 w-8 text-primary" />
                  <span>משכורות ותלושים</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5" onClick={() => onTabChange && onTabChange('ארכיון מסמכים')}>
                  <FileText className="h-8 w-8 text-primary" />
                  <span>מסמכים כלליים</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                תמיכה וצ'אט פנימי
              </CardTitle>
              <CardDescription>התכתבות ישירה עם צוות המשרד בנוגע למסמכים ושאלות</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[400px]">
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/10">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">צוות</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm border border-border/50 max-w-[80%]">
                      <p className="text-sm">שלום {user?.name?.split(' ')[0]}, איך נוכל לעזור לך היום?</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">10:00</span>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white">
                      <span className="text-xs font-bold">{user?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
                      <p className="text-sm">העליתי את טופס 106, האם זה תקין?</p>
                      <span className="text-[10px] text-primary-foreground/70 mt-1 block text-left">10:15</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">צוות</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm border border-border/50 max-w-[80%]">
                      <p className="text-sm">כן, קיבלנו. תודה! נעדכן ברגע שנסיים את הבדיקה.</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">10:20</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-border bg-white">
                  <div className="flex gap-2">
                    <Input placeholder="הקלד הודעה..." className="rounded-full bg-muted/50 border-transparent focus-visible:ring-primary/20" />
                    <Button className="rounded-full shrink-0" size="icon">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <KnowledgeBase articles={knowledgeBase} showTitle={false} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-8"
        >
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                לוח שנה למיסוי
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[
                { date: '15/04', title: 'מע"מ דו-חודשי', urgent: true },
                { date: '30/04', title: 'מקדמות מס', urgent: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold",
                      item.urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    )}>
                      <span>{item.date.split('/')[1]}</span>
                      <span className="text-sm leading-none">{item.date.split('/')[0]}</span>
                    </div>
                    <span className="text-sm font-bold">{item.title}</span>
                  </div>
                  {item.urgent ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl">שקיפות מלאה - לוג פעילות</CardTitle>
              <CardDescription>כל מה שקורה בתיק שלך בזמן אמת</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {userTimeline.map((event, i) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {i !== userTimeline.length - 1 && (
                      <div className="absolute right-[15px] top-8 w-0.5 h-full bg-muted" />
                    )}
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10",
                      event.type === 'approval' ? "bg-green-100 text-green-600" : 
                      event.type === 'review' ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary"
                    )}>
                      {event.type === 'approval' ? <CheckCircle2 className="h-4 w-4" /> : 
                       event.type === 'review' ? <Search className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
                        {new Date(event.timestamp).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl">התקדמות התהליך</CardTitle>
              <CardDescription>מעקב אחר שלבי הטיפול בבקשה</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="relative space-y-8 pr-6 before:absolute before:right-[11px] before:top-2 before:h-[calc(100%-24px)] before:w-0.5 before:bg-muted">
                {statusSteps.map((step) => (
                  <div key={step.id} className="relative">
                    <div className={cn(
                      "absolute -right-[23px] top-1 h-5 w-5 rounded-full border-4 bg-background transition-all duration-300",
                      step.isCompleted ? "border-primary bg-primary" : step.isCurrent ? "border-primary animate-pulse" : "border-muted"
                    )} />
                    <div className="flex flex-col gap-1">
                      <h4 className={cn(
                        "text-base font-bold leading-none",
                        step.isCurrent ? "text-primary" : step.isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-foreground">
                <Lightbulb className="h-5 w-5 text-primary-foreground" />
                טיפ היום ({new Date().toLocaleDateString('he-IL', { month: 'long' })})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed opacity-90">
                {(() => {
                   const tips = [
                     "האם ידעת? ניתן לקבל החזר מס גם על תרומות למוסדות מוכרים (סעיף 46). שים לב להעלות קבלות!",
                     "קרב ובא מועד הדיווח למע\"מ? אל תשכח להעלות חשבוניות בפורמט דיגיטלי לפני ה-15 לחודש.",
                     "טיפ חשוב לגבי הוצאות רכב: הוצאה שלא הוגדרה נכונה יכולה לעלות במיסים מיותרים. הקפד על פירוט תקין.",
                     "סוף שנה אזרחית מתקרב - זה הזמן להפקדות לקרנות השתלמות וקופות גמל כדי להנות מהטבות המס.",
                     "תשלום מיסים באיחור גורר קנסות. לוח השנה למיסוי שלנו יעזור לך לעקוב אחר תאריכי החובה."
                   ];
                   const tipIndex = new Date().getDate() % tips.length;
                   return tips[tipIndex];
                })()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
