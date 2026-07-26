/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { AIChatbot } from './components/AIChatbot';
import { DocumentArchive } from './components/DocumentArchive';
import { DocumentUpload } from './components/DocumentUpload';
import { MyDocuments } from './components/MyDocuments';
import { KnowledgeBase } from './components/KnowledgeBase';
import { Community } from './components/Community';
import { Scheduling } from './components/Scheduling';
import { SettingsView } from './components/SettingsView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from './services/api';
import { initDB, onDBChange, setCurrentActor, logActivity } from './lib/mockData';
import { User, Document } from './types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('דאשבורד');
  const [db, setDb] = useState<any>(null);
  const [dbReady, setDbReady] = useState(false);
  // Bumped whenever another user changes the shared database (realtime),
  // forcing dependent views to re-read the latest data.
  const [syncTick, setSyncTick] = useState(0);

  const taxCalendar = [
    { date: '15/04', title: 'דיווח מע"מ דו-חודשי', type: 'urgent' },
    { date: '30/04', title: 'מקדמות מס הכנסה', type: 'normal' },
    { date: '15/05', title: 'דיווח ניכויים', type: 'normal' },
  ];

  // Connect to the shared database (Supabase) and listen for live updates.
  useEffect(() => {
    let off = () => {};
    initDB().finally(() => {
      setDbReady(true);
      off = onDBChange(() => setSyncTick((t) => t + 1));
    });
    return () => off();
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('mas4u_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setCurrentActor(parsedUser.name);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse saved user from localStorage:', error);
        localStorage.removeItem('mas4u_user');
      }
    }
  }, []);

  useEffect(() => {
    // Load knowledge base and (when a user is known) their documents.
    let isCancelled = false;
    const loadInitialData = async () => {
      try {
        const [knowledge, docs] = await Promise.all([
          api.getKnowledgeBase(),
          user ? api.getDocuments(user.id) : Promise.resolve([])
        ]);
        if (!isCancelled) {
          setDb({ knowledgeBase: knowledge, documents: docs });
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();
    return () => { isCancelled = true; };
  }, [user?.id, syncTick]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentActor(userData.name);
    logActivity('התחברות למערכת');
    setIsAuthenticated(true);
    localStorage.setItem('mas4u_user', JSON.stringify(userData));
    toast.success(`ברוך הבא, ${userData.name}!`, {
      description: 'התחברת בהצלחה למערכת.'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('mas4u_user');
    toast.info('התנתקת מהמערכת.');
  };

  if (!dbReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">מתחבר למסד הנתונים המשותף…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar - Desktop */}
      <Sidebar onLogout={handleLogout} userRole={user?.role} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onLogout={handleLogout} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {user?.role === 'admin' ? (
            <AdminDashboard key={syncTick} activeTab={activeTab} onTabChange={setActiveTab} currentUser={user} />
          ) : (
            <>
              {activeTab === 'דאשבורד' && <Dashboard user={user} onTabChange={setActiveTab} />}
              {activeTab === 'העלאת מסמכים' && (
                <DocumentUpload 
                  documents={(db?.documents || []).filter((d: Document) => d.userId === user?.id)} 
                  onUpload={async (files, purpose) => {
                    if (!user) return;
                    try {
                      for (const file of files) {
                        await api.uploadDocument(user.id, file, purpose as any);
                      }
                      const updatedDocs = await api.getDocuments(user.id);
                      setDb((prev: any) => ({ ...prev, documents: updatedDocs }));
                    } catch (error) {
                      console.error('Failed to save uploaded documents:', error);
                    }
                  }}
                  onLockMonth={() => console.log('Month Locked')}
                  onScanDocuments={() => console.log('Scanned Docs')}
                />
              )}
              {activeTab === 'המסמכים שלי' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <h1 className="text-4xl font-extrabold tracking-tight text-primary">{activeTab}</h1>
                  <MyDocuments documents={(db?.documents || []).filter((d: Document) => d.userId === user?.id && d.uploadedBy === 'client')} onNavigateToUpload={() => setActiveTab('העלאת מסמכים')} />
                </div>
              )}
              {activeTab === 'ארכיון מסמכים' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <h1 className="text-4xl font-extrabold tracking-tight text-primary">{activeTab}</h1>
                  <DocumentArchive documents={(db?.documents || []).filter((d: Document) => d.userId === user?.id && d.uploadedBy === 'admin')} />
                </div>
              )}
              {activeTab === 'מרכז ידע וזכויות' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <h1 className="text-4xl font-extrabold tracking-tight text-primary">מרכז ידע וזכויות</h1>
                  <KnowledgeBase articles={db?.knowledgeBase || []} />
                </div>
              )}
              {activeTab === 'קהילה' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <Community />
                </div>
              )}
              {activeTab === 'תמיכה וצ\'אט' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">תמיכה וצ'אט</h1>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-full gap-2 border-primary/20 hover:bg-primary/5">
                        <CalendarIcon className="h-4 w-4" />
                        פגישה חדשה
                      </Button>
                      <Button className="rounded-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp ישיר
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card className="border-none shadow-sm bg-card/50 backdrop-blur min-h-[400px] flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <MessageCircle className="h-12 w-12 text-primary mx-auto opacity-20" />
                          <p className="text-muted-foreground">הצ'אט עם המשרד יהיה זמין כאן בקרוב</p>
                          <Button variant="outline" className="rounded-full">פתח פנייה חדשה</Button>
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
                        <CardHeader className="bg-primary/5 border-b border-primary/10">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            לוח שנה למיסוי
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {taxCalendar.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-10 w-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold",
                                  item.type === 'urgent' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                )}>
                                  <span className="opacity-70">{item.date.split('/')[1]}</span>
                                  <span className="text-sm leading-none">{item.date.split('/')[0]}</span>
                                </div>
                                <span className="text-sm font-bold">{item.title}</span>
                              </div>
                              {item.type === 'urgent' ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Scheduling onSchedule={async (date, time, type) => {
                      if (!user) return;
                      try {
                        await api.scheduleAppointment({ userId: user.id, date, time, type });
                        toast.success('הפגישה נקבעה בהצלחה!');
                      } catch (error) {
                        console.error('Failed to schedule appointment:', error);
                        toast.error('אירעה שגיאה בקביעת הפגישה. אנא נסה שוב.');
                      }
                    }} />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'הגדרות' && (
                <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                  <h1 className="text-4xl font-extrabold tracking-tight text-primary">הגדרות חשבון</h1>
                  {user && <SettingsView user={user} onUpdateProfile={async (updates) => {
                    if (!user) return;
                    try {
                      const updatedUser = await api.updateUserProfile(user.id, updates);
                      setUser(updatedUser);
                      toast.success('הפרטים האישיים עודכנו בהצלחה');
                    } catch (error) {
                      console.error('Failed to update profile:', error);
                      toast.error('אירעה שגיאה בעדכון הפרטים');
                    }
                  }} />}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {(user?.role !== 'admin') && <AIChatbot />}
    </div>
  );
}

