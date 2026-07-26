import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Video, Users, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getDB } from '@/src/lib/mockData';

interface SchedulingProps {
  onSchedule: (date: string, time: string, type: 'frontal' | 'zoom') => void;
}

export function Scheduling({ onSchedule }: SchedulingProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'frontal' | 'zoom' | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const availableTimes = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
  const db = getDB();
  
  const isTimeTaken = (d: string, t: string) => {
    return db.appointments.some(a => a.date === d && a.time === t && a.status === 'scheduled');
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });

  const handleComplete = () => {
    if (date && time && type) {
      onSchedule(date, time, type);
      setStep(4);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-card/50 backdrop-blur overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-xl">תיאום פגישת ייעוץ</CardTitle>
            <CardDescription>קבע פגישה עם המטפל האישי שלך בקלות</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-bold text-lg">בחר את סוג הפגישה:</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className={cn(
                    "h-32 flex flex-col gap-3 rounded-2xl border-2 transition-all",
                    type === 'zoom' ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  )}
                  onClick={() => { setType('zoom'); setStep(2); }}
                >
                  <Video className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-bold">פגישת Zoom</p>
                    <p className="text-xs text-muted-foreground">ייעוץ מרחוק</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-32 flex flex-col gap-3 rounded-2xl border-2 transition-all",
                    type === 'frontal' ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  )}
                  onClick={() => { setType('frontal'); setStep(2); }}
                >
                  <Users className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-bold">פגישה פרונטלית</p>
                    <p className="text-xs text-muted-foreground">במשרדי Mas4U</p>
                  </div>
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">בחר תאריך:</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                  <ChevronRight className="h-4 w-4" />
                  חזור
                </Button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {next7Days.map((d) => {
                  const dateObj = new Date(d);
                  const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  return (
                    <Button
                      key={d}
                      variant="outline"
                      className={cn(
                        "h-20 flex flex-col p-1 rounded-xl border-2",
                        date === d ? "border-primary bg-primary/5" : ""
                      )}
                      onClick={() => { setDate(d); setStep(3); }}
                    >
                      <span className="text-[10px] uppercase opacity-60">{dayName}</span>
                      <span className="text-xl font-black">{dayNum}</span>
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">בחר שעה:</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1">
                  <ChevronRight className="h-4 w-4" />
                  חזור
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((t) => {
                  const taken = date ? isTimeTaken(date, t) : false;
                  return (
                    <Button
                      key={t}
                      variant="outline"
                      disabled={taken}
                      className={cn(
                        "h-12 rounded-xl border-2",
                        time === t ? "border-primary bg-primary/5" : "",
                        taken && "opacity-50 cursor-not-allowed bg-muted"
                      )}
                      onClick={() => setTime(t)}
                    >
                      <Clock className="h-4 w-4 ml-2 opacity-60" />
                      {t}
                      {taken && <span className="text-[10px] mr-1">(תפוס)</span>}
                    </Button>
                  );
                })}
              </div>
              <Button 
                className="w-full h-12 rounded-xl mt-4 bg-primary text-primary-foreground font-bold"
                disabled={!time}
                onClick={handleComplete}
              >
                קבע פגישה
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center space-y-4"
            >
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-primary">הפגישה נקבעה!</h3>
                <p className="text-muted-foreground">
                  נקבעה לך פגישת {type === 'zoom' ? 'Zoom' : 'פרונטלית'} ליום {new Date(date!).toLocaleDateString('he-IL')} בשעה {time}.
                </p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>
                קבע פגישה נוספת
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
