import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  ChevronRight, Eye, MessageCircle, User as UserIcon, FileText, Clock, AlertTriangle,
  CheckCircle, Phone, Mail, Briefcase, Hash, Building2, CalendarClock, ShieldCheck, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { User, DB, MessageTemplate } from '@/src/types';

export interface ClientProfileProps {
  client: User;
  db: DB;
  templates: MessageTemplate[];
  onBack: () => void;
  onToggleWatch: (userId: string) => void;
  onSendTemplate: (client: User, text: string) => void;
}

const statusColor = (s?: string) => {
  switch (s) {
    case 'יש': return 'bg-green-100 text-green-700 border-green-200';
    case 'חסר': return 'bg-red-100 text-red-700 border-red-200';
    case 'בתהליך': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-muted text-muted-foreground border-border/50';
  }
};

const annualLabel = (s?: string) =>
  s === 'not_started' ? 'טרם התחיל' :
  s === 'collecting_docs' ? 'איסוף מסמכים' :
  s === 'in_preparation' ? 'בהכנה' :
  s === 'submitted' ? 'שודר' :
  s === 'completed' ? 'הושלם' : 'טרם התחיל';

export function ClientProfile({ client, db, templates, onBack, onToggleWatch, onSendTemplate }: ClientProfileProps) {
  const docs = (db.documents || []).filter((d) => d.userId === client.id);
  const timeline = (db.timeline || []).filter((t) => t.userId === client.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const clientDeadlines = (db.deadlines || []).filter((d) => d.clientName && d.clientName === client.name);
  const missing = client.missingDocuments || [];
  const annualDocs = client.annualReportDocs;

  const detail = (icon: React.ReactNode, label: string, value?: React.ReactNode) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={onBack} title="חזרה לרשימה">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black shrink-0">
            {client.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black tracking-tight text-primary">{client.name}</h2>
              {client.clientNumber && <Badge variant="secondary" className="text-[10px]">#{client.clientNumber}</Badge>}
              {client.isWatched && <Badge className="text-[10px] bg-amber-500 text-white gap-1"><Eye className="h-2.5 w-2.5" />במעקב</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" className="rounded-full gap-2 text-green-600 border-green-200 hover:bg-green-50">
                <MessageCircle className="h-4 w-4" />וואטסאפ
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>שליחת הודעה מתבנית</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.length === 0 ? (
                <DropdownMenuItem disabled>אין תבניות (הוסף בהגדרות)</DropdownMenuItem>
              ) : (
                templates.map((tpl) => (
                  <DropdownMenuItem key={tpl.id} onClick={() => onSendTemplate(client, tpl.text)}>{tpl.title}</DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={client.isWatched ? 'default' : 'outline'}
            className={cn('rounded-full gap-2', client.isWatched && 'bg-amber-500 hover:bg-amber-600 text-white')}
            onClick={() => onToggleWatch(client.id)}
          >
            <Eye className="h-4 w-4" />{client.isWatched ? 'במעקב' : 'מעקב'}
          </Button>
        </div>
      </div>

      {/* Watch reason */}
      {client.isWatched && client.watchReason && (
        <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <Eye className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900"><span className="font-bold">סיבת מעקב: </span>{client.watchReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-lg flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" />פרטי לקוח</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail(<Hash className="h-4 w-4" />, 'מספר לקוח', client.clientNumber)}
            {detail(<Building2 className="h-4 w-4" />, 'ח.פ / ת"ז', client.companyId || client.idNumber)}
            {detail(<FileText className="h-4 w-4" />, 'תיק ניכויים', client.deductionsId)}
            {detail(<Phone className="h-4 w-4" />, 'טלפון', client.phone)}
            {detail(<Mail className="h-4 w-4" />, 'אימייל', client.email)}
            {detail(<Briefcase className="h-4 w-4" />, 'עיסוק', client.occupation)}
            {detail(<ShieldCheck className="h-4 w-4" />, 'סוג עוסק', client.dealerType)}
            {detail(<CalendarClock className="h-4 w-4" />, 'תדירות מע"מ', client.vatFrequency)}
            {detail(<CalendarClock className="h-4 w-4" />, 'תדירות מס הכנסה', client.incomeTaxFrequency)}
            {detail(<UserIcon className="h-4 w-4" />, 'עובד מטפל', client.assignedEmployee)}
            {detail(<Hash className="h-4 w-4" />, 'קוד קבוע (הקצאות)', client.assignmentCode)}
            {typeof client.taxHealthScore === 'number' && detail(<Activity className="h-4 w-4" />, 'ציון בריאות מס', `${client.taxHealthScore}/100`)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Annual report */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />דוח שנתי</CardTitle>
            <CardDescription>סטטוס: {annualLabel(client.annualReportStatus)}</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {annualDocs ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['טופס 106', annualDocs.form106],
                  ['טופס 106 בן/ת זוג', annualDocs.form106Spouse],
                  ['קרן השתלמות', annualDocs.studyFund],
                  ['טופס 867', annualDocs.form867],
                  ['אישורי קצבאות', annualDocs.allowances],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50">
                    <span className="text-sm">{label}</span>
                    <Badge variant="outline" className={cn('text-[10px]', statusColor(val as string))}>{(val as string) || 'אין'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-6">אין עדיין נתוני דוח שנתי</div>
            )}
          </CardContent>
        </Card>

        {/* Missing documents */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />מסמכים חסרים</CardTitle>
            <CardDescription>{missing.length > 0 ? `${missing.length} מסמכים ממתינים` : 'אין מסמכים חסרים'}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {missing.length === 0 ? (
              <div className="text-center text-sm text-green-600 py-6 flex flex-col items-center gap-2">
                <CheckCircle className="h-6 w-6" />הכל התקבל
              </div>
            ) : (
              missing.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-[11px] text-muted-foreground">עד {m.deadline}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />מסמכים ({docs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">עדיין אין מסמכים ללקוח זה</div>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.date}{d.category ? ` · ${d.category}` : ''}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {d.status === 'approved' ? 'אושר' : d.status === 'pending' ? 'ממתין' : d.status === 'rejected' ? 'נדחה' : d.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Deadlines + timeline */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />דדליינים ופעילות</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {clientDeadlines.length > 0 && (
              <div className="space-y-2">
                {clientDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                    <span className="text-sm font-medium">{d.title}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(d.date + 'T00:00:00').toLocaleDateString('he-IL')}</span>
                  </div>
                ))}
              </div>
            )}
            {timeline.length === 0 && clientDeadlines.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">אין עדיין פעילות מתועדת</div>
            ) : (
              timeline.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground/70">{new Date(t.timestamp).toLocaleString('he-IL')}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for upcoming financial tables */}
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          כאן יופיעו הנתונים הפיננסיים של הלקוח (מע"מ, מס הכנסה, הצהרות הון, ניכוי במקור) והניתוח החכם — נבנה בשלב הבא מתוך הטבלאות.
        </CardContent>
      </Card>
    </motion.div>
  );
}
