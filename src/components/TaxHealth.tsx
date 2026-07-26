import React from 'react';
import { Heart, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'motion/react';

interface TaxHealthProps {
  score: number;
  missingDocumentsCount?: number;
}

export function TaxHealth({ score, missingDocumentsCount = 0 }: TaxHealthProps) {
  const getStatus = (s: number) => {
    if (s >= 90) return { label: 'מצוין', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    if (s >= 70) return { label: 'טוב', color: 'text-blue-600', bg: 'bg-blue-100', icon: TrendingUp };
    return { label: 'טעון שיפור', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle };
  };

  const status = getStatus(score);
  const refundPotential = score >= 85
    ? { label: 'גבוה', color: 'text-green-600' }
    : score >= 60
    ? { label: 'בינוני', color: 'text-amber-600' }
    : { label: 'נמוך', color: 'text-red-600' };

  return (
    <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary/20" />
            <CardTitle className="text-lg">ציון בריאות מס</CardTitle>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
            {status.label}
          </div>
        </div>
        <CardDescription>כמה התיק שלך מוכן להחזר מס מקסימלי</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-end justify-between mb-1">
          <span className="text-4xl font-black text-primary">{score}%</span>
          <status.icon className={`h-8 w-8 ${status.color}`} />
        </div>
        <Progress value={score} className="h-3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/50 p-2 rounded-lg border border-primary/5">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">מסמכים חסרים</p>
            <p className="text-sm font-bold">{missingDocumentsCount}</p>
          </div>
          <div className="bg-white/50 p-2 rounded-lg border border-primary/5">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">פוטנציאל החזר</p>
            <p className={`text-sm font-bold ${refundPotential.color}`}>{refundPotential.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
