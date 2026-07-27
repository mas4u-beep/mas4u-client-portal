import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, User as UserIcon, Mail, Key, CheckCircle2, MessageCircle, Send, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/src/services/api';
import { signIn } from '@/src/lib/auth';
import { initDB, getDB } from '@/src/lib/mockData';
import { supabase } from '@/src/lib/supabaseClient';
import { User } from '@/src/types';
import { toast } from 'sonner';

interface AuthProps {
  onLogin: (user: User) => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

const REG_STEPS = [
  { field: 'firstName', question: 'היי! איזה כיף שהצטרפת אלינו. איך קוראים לך? (שם פרטי)' },
  { field: 'lastName', question: 'נעים להכיר! ומה שם המשפחה?' },
  { field: 'phone', question: 'מה מספר הטלפון שלך, שנוכל להיות בקשר?' },
  { field: 'email', question: 'מה כתובת האימייל שלך?' },
  { field: 'idNumber', question: 'מה מספר תעודת הזהות (או ח.פ) שלך?' },
  { field: 'occupation', question: 'במה אתה עוסק? (למשל: נגר, מעצב פנים)' },
  { field: 'dealerType', question: 'ולסיום, מה סוג העוסק שלך?', options: ['פטור', 'מורשה'] },
  { field: 'personalCode', question: 'מה קוד הבקרה / קוד לקוח שקיבלת מהמשרד?' },
];

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  
  // Reg states
  const [regData, setRegData] = useState<any>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Bot initialization
  useEffect(() => {
    if (!isLogin && messages.length === 0) {
      setMessages([{ id: Date.now().toString(), sender: 'bot', text: REG_STEPS[0].question }]);
    }
  }, [isLogin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(loginEmail)) {
      setError('כתובת האימייל אינה תקינה. אנא הזן אימייל בפורמט נכון.');
      return;
    }

    setIsLoading(true);
    try {
      const email = loginEmail.trim().toLowerCase();

      // Secure login via Supabase Auth (email + password).
      if (supabase) {
        const res = await signIn(email, loginCode);
        if (!res.ok) {
          setError('אימייל או סיסמה שגויים. אנא נסה שוב.');
          setIsLoading(false);
          return;
        }
        // Re-load the shared data now that we have an authenticated session.
        await initDB();
        const profile = (getDB().users || []).find(
          (u) => u.email && u.email.toLowerCase() === email
        );
        if (!profile) {
          setError('התחברת, אך לא נמצא פרופיל משתמש מתאים במערכת. פנה למנהל.');
        } else if (profile.status === 'pending') {
          setError('חשבונך ממתין לאישור מנהל. לא ניתן להתחבר כרגע.');
        } else {
          onLogin(profile);
        }
        setIsLoading(false);
        return;
      }

      // Local/dev fallback only (Supabase not configured): email + personal code.
      const user = await api.login(email, loginCode);
      if (user) {
        if (user.status === 'pending') {
          setError('חשבונך ממתין לאישור מנהל. לא ניתן להתחבר כרגע.');
        } else {
          onLogin(user);
        }
      } else {
        setError('פרטי התחברות שגויים.');
      }
    } catch (err) {
      setError('אירעה שגיאה בתהליך האימות. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBotSubmit = async (value: string) => {
    if (!value.trim()) return;

    const step = REG_STEPS[currentStep];
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: value }]);
    
    // Save data
    const newData = { ...regData, [step.field]: value };
    setRegData(newData);
    setInputValue('');

    // Check if there's a next step
    if (currentStep < REG_STEPS.length - 1) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: REG_STEPS[currentStep + 1].question }]);
        setCurrentStep(prev => prev + 1);
      }, 500);
    } else {
      // Finish registration
      setTimeout(async () => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'מעולה, מסיים את ההרשמה...' }]);
        setIsLoading(true);
        try {
          await api.createUser({
            name: `${newData.firstName} ${newData.lastName}`,
            firstName: newData.firstName,
            lastName: newData.lastName,
            phone: newData.phone,
            idNumber: newData.idNumber,
            occupation: newData.occupation,
            dealerType: newData.dealerType as any,
            email: newData.email,
            personalCode: newData.personalCode,
            role: 'client',
            status: 'pending',
          });
          toast.success('הרשמתך התקבלה בהצלחה!', { description: 'היא ממתינה לאישור מנהל.' });
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: 'הרשמתך התקבלה בהצלחה! היא ממתינה לאישור מנהל. תוכל להתחבר מיד לאחר האישור.' }]);
          setTimeout(() => {
            setIsLogin(true);
            setMessages([]);
            setCurrentStep(0);
            setRegData({});
          }, 4000);
        } catch (err) {
          toast.error('שגיאה בתהליך ההרשמה', { description: 'אנא נסה שוב מאוחר יותר.' });
          setError('אירעה שגיאה בתהליך ההרשמה.');
        } finally {
          setIsLoading(false);
        }
      }, 500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/10 shadow-2xl backdrop-blur-sm bg-card/95 rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 text-center bg-primary/5 pb-8 relative">
            <div className="flex justify-center mb-4 mt-2">
              <div className="rounded-full bg-primary/10 p-5 border border-primary/10 shadow-inner">
                {isLogin ? <Lock className="h-8 w-8 text-primary" /> : <MessageCircle className="h-8 w-8 text-primary" />}
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-primary">
              {isLogin ? 'ברוכים הבאים' : 'הצטרפות מהירה'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isLogin ? 'הזן את פרטי ההתחברות שלך' : 'כמה פרטים וסיימנו'}
            </CardDescription>
          </CardHeader>
          
          {isLogin ? (
            <form onSubmit={submitLogin}>
              <CardContent className="space-y-5 pt-8">
                <div className="space-y-3">
                  <Label htmlFor="loginEmail">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="loginEmail"
                      type="email"
                      placeholder="name@example.com"
                      className="pr-12 h-12 rounded-xl border-primary/20 bg-primary/5 focus-visible:ring-primary/20"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="loginCode">סיסמה / קוד אישי</Label>
                  <div className="relative">
                    <Key className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="loginCode"
                      type="password"
                      placeholder="••••••••"
                      className="pr-12 h-12 rounded-xl border-primary/20 bg-primary/5 focus-visible:ring-primary/20"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pb-8">
                <Button type="submit" className="w-full text-lg h-14 rounded-full shadow-lg" disabled={isLoading}>
                  {isLoading ? 'רגע...' : 'התחברות'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-primary hover:bg-primary/5 rounded-full h-12 mt-2"
                  onClick={() => setIsLogin(false)}
                >
                  לקוח חדש? בוא נכיר
                </Button>

                <button
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-destructive underline mt-2"
                  onClick={() => setShowConfirmReset(true)}
                >
                  איפוס מערכת
                </button>
              </CardFooter>
            </form>
          ) : (
            <div className="flex flex-col h-[400px]">
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-primary/10 text-foreground rounded-tl-sm border border-primary/10'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-primary/10 rounded-2xl p-4 rounded-tl-sm w-16 flex justify-center">
                      <span className="animate-pulse">...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                {!isLoading && currentStep < REG_STEPS.length && (
                  REG_STEPS[currentStep].options ? (
                    <div className="flex gap-2">
                      {REG_STEPS[currentStep].options.map(opt => (
                        <Button 
                          key={opt} 
                          className="flex-1 rounded-full h-12" 
                          variant="outline"
                          onClick={() => handleBotSubmit(opt)}
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleBotSubmit(inputValue);
                      }}
                      className="flex gap-2 relative"
                    >
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="הקלד תשובה..."
                        className="h-12 rounded-full pr-4 pl-12 bg-primary/5 border-primary/20 focus-visible:ring-primary/20"
                        autoFocus
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        className="absolute left-1 top-1 h-10 w-10 rounded-full shadow-md"
                        disabled={!inputValue.trim()}
                      >
                         <Send className="h-4 w-4 rtl:-scale-x-100" />
                      </Button>
                    </form>
                  )
                )}
                
                {!isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground mt-4 hover:bg-transparent hover:text-primary flex items-center justify-center gap-1"
                    onClick={() => {
                      setIsLogin(true);
                      setMessages([]);
                      setCurrentStep(0);
                    }}
                  >
                    חזור להתחברות <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <AnimatePresence>
        {showConfirmReset && (
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
              className="bg-card p-6 rounded-3xl shadow-xl border border-border max-w-sm w-full"
            >
              <h3 className="text-lg font-bold mb-2">איפוס מערכת</h3>
              <p className="text-muted-foreground mb-6">האם אתה בטוח שברצונך לאפס את כל נתוני האפליקציה? פעולה זו תמחק את כל המשתמשים והמסמכים החדשים שנוצרו.</p>
              <div className="flex justify-end gap-3 flex-row-reverse">
                <Button variant="destructive" className="rounded-full" onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}>איפוס</Button>
                <Button variant="outline" className="rounded-full" onClick={() => setShowConfirmReset(false)}>ביטול</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
