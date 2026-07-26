import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '@/src/types';

// Lazily create the AI client so a missing API key does not crash the whole app on load.
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!_ai) {
    try {
      _ai = new GoogleGenAI({ apiKey });
    } catch {
      return null;
    }
  }
  return _ai;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'שלום! אני העוזר החכם של Mas4U. איך אני יכול לעזור לך היום בנושאי מיסוי וזכויות?', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = getAI();
      if (!ai) {
        const noKeyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'שירות ה-AI אינו מוגדר כרגע (חסר מפתח API). לשאלות אנא פנו אלינו בוואטסאפ ונחזור אליכם בהקדם.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, noKeyMsg]);
        setIsLoading(false);
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: `
            אתה עוזר חכם ומקצועי של משרד Mas4U, מומחה להנהלת חשבונות, מיסוי ושכר בישראל.
            תפקידך לענות על שאלות לקוחות בנושאי:
            - פתיחת תיקים (עוסק פטור/מורשה/חברה)
            - דיווחים שוטפים למע"מ, מס הכנסה וביטוח לאומי
            - דיני עבודה, חישוב שכר, פנסיה ופיצויים בישראל
            - החזרי מס לשכירים ועצמאיים
            - הצהרות הון ודוחות שנתיים
            
            הנחיות חשובות:
            1. ענה תמיד בעברית רהוטה ומקצועית.
            2. אם השאלה מורכבת מדי או דורשת ייעוץ ספציפי לתיק הלקוח, המלץ לו בחום לפנות למטפל האישי שלו בוואטסאפ של המשרד.
            3. אם התשובה שנתת אינה מספקת את הלקוח או שהוא מבקש לדבר עם נציג, ציין במפורש: "לייעוץ מעמיק יותר בתיק האישי שלך, אני ממליץ לשלוח לנו הודעה בוואטסאפ ונחזור אליך בהקדם".
          `,
        }
      });

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'מצטער, לא הצלחתי לעבד את הבקשה. נסה שוב מאוחר יותר.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'חלה שגיאה בחיבור לשרת ה-AI. אנא נסה שוב מאוחר יותר.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={isMinimized ? "w-72" : "w-80 sm:w-96"}
          >
            <Card className="shadow-2xl border-primary/20 overflow-hidden bg-card/95 backdrop-blur">
              <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle className="text-sm font-bold">העוזר החכם של Mas4U</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {!isMinimized && (
                <>
                  <CardContent className="h-96 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}>
                          <div className="flex items-center gap-2 mb-1 opacity-70">
                            {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                            <span className="text-[10px]">{msg.role === 'user' ? 'אני' : 'Mas4U AI'}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-end">
                        <div className="bg-muted p-3 rounded-2xl rounded-tl-none">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <div className="p-4 border-t bg-background/50">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="שאל אותי משהו..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="bg-background"
                      />
                      <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl hover:scale-110 transition-transform bg-primary text-primary-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bot className="h-7 w-7" />
      </Button>
    </div>
  );
}
