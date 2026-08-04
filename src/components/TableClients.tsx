import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronRight, Search, Loader2, User as UserIcon, Users, Phone, Hash, FileText, Wallet, Database, ClipboardCheck, CheckCircle2, Clock, AlertTriangle, ClipboardList, Plus, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { User } from '@/src/types';
import {
  DataTableMeta, DataRow, TableColumn,
  listTables, getRows, updateRow, findIdColumn, findRowsByValue,
} from '@/src/lib/dataTables';
import { getDB, createTeamTask, logActivity } from '@/src/lib/mockData';

const waLink = (raw: string) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits.startsWith('972') ? digits : '972' + digits;
  return `https://wa.me/${intl}`;
};

const DONE_WORDS = ['חתימה', 'מוכן', 'הוגש', 'טופל', 'שולם', 'דווח', 'שודר'];
const FLAG_WORDS = ['חסר'];
const statusKind = (label: string): 'done' | 'flag' | null =>
  FLAG_WORDS.some((w) => label.includes(w)) ? 'flag' : DONE_WORDS.some((w) => label.includes(w)) ? 'done' : null;

interface Props { currentUser?: User | null; }

export function TableClients({ currentUser }: Props) {
  const [tables, setTables] = useState<DataTableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceId, setSourceId] = useState<string>('');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [related, setRelated] = useState<{ table: DataTableMeta; rows: DataRow[] }[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [tick, setTick] = useState(0); // force re-read of tasks after creating one
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [ntText, setNtText] = useState('');
  const [ntEmp, setNtEmp] = useState('');
  const [ntPriority, setNtPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    listTables().then((t) => {
      setTables(t);
      // Choose a sensible default client source: a table with an ID column + a family-name column.
      const saved = localStorage.getItem('mas4u_client_source');
      const pref = t.find((x) => x.id === saved)
        || t.find((x) => findIdColumn(x.columns) && x.columns.some((c) => c.label.includes('משפחה')))
        || t.find((x) => findIdColumn(x.columns)) || t[0];
      if (pref) setSourceId(pref.id);
    }).catch((e) => toast.error('שגיאה בטעינת הטבלאות', { description: e?.message }))
      .finally(() => setLoading(false));
  }, []);

  const source = tables.find((t) => t.id === sourceId) || null;
  const idCol = source ? findIdColumn(source.columns) : null;
  const famCol = source?.columns.find((c) => c.label.includes('משפחה'));
  const firstCol = source?.columns.find((c) => c.label === 'פרטי' || c.label === 'שם' || c.label.includes('שם פרטי'));
  const phoneCol = source?.columns.find((c) => c.label.includes('טלפון'));

  const clientName = (r: DataRow) => [famCol && r.data[famCol.key], firstCol && r.data[firstCol.key]].filter(Boolean).join(' ').trim() || (idCol ? r.data[idCol.key] : '') || 'ללא שם';

  useEffect(() => {
    if (!sourceId) { setRows([]); return; }
    localStorage.setItem('mas4u_client_source', sourceId);
    setLoadingRows(true);
    getRows(sourceId).then(setRows).catch((e) => toast.error('שגיאה בטעינת הלקוחות', { description: e?.message })).finally(() => setLoadingRows(false));
    setOpenId(null); setSearch('');
  }, [sourceId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r.data).some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const openClient = source?.id && openId ? rows.find((r) => r.id === openId) : null;
  const openClientIdValue = openClient && idCol ? String(openClient.data[idCol.key] ?? '') : '';

  // When a client is opened, look them up across other ID-bearing tables.
  useEffect(() => {
    if (!openClient) { setRelated([]); return; }
    if (!openClientIdValue) { setRelated([]); return; }
    setLoadingRelated(true);
    const others = tables.filter((t) => t.id !== sourceId);
    Promise.all(
      others.map(async (t) => {
        const idc = findIdColumn(t.columns);
        if (!idc) return null;
        try {
          const matches = await findRowsByValue(t.id, idc.key, openClientIdValue);
          return matches.length ? { table: t, rows: matches } : null;
        } catch { return null; }
      })
    ).then((res) => setRelated(res.filter(Boolean) as any))
      .finally(() => setLoadingRelated(false));
  }, [openId, openClientIdValue]);

  const saveField = async (row: DataRow, key: string, value: string) => {
    if (String(row.data[key] ?? '') === value) return;
    const newData = { ...row.data, [key]: value };
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, data: newData } : r)));
    try { await updateRow(row.id, newData); } catch (e: any) { toast.error('שמירה נכשלה', { description: e?.message }); }
  };

  // Team / tasks bridge (read from the shared app-state DB).
  const employees = getDB().employees || [];
  const myEmp = employees.find(
    (e) => (currentUser?.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) || (currentUser?.name && e.name === currentUser.name)
  );
  const clientTasksFor = (name: string) => (getDB().teamTasks || []).filter((t) => t.clientName && t.clientName === name && !t.isDone);

  const openNewTask = (name: string) => {
    setNtText(name ? `טיפול בלקוח ${name}` : '');
    setNtEmp(myEmp?.id || employees[0]?.id || '');
    setNtPriority('medium');
    setNewTaskOpen(true);
  };
  const submitNewTask = (name: string, tz: string) => {
    if (!ntEmp) { toast.error('בחר עובד'); return; }
    const target = employees.find((e) => e.id === ntEmp);
    createTeamTask({
      task: ntText.trim() || `טיפול בלקוח ${name}`,
      employeeId: ntEmp,
      assigneeName: target?.name,
      assignedByName: currentUser?.name || myEmp?.name || 'המשרד',
      priority: ntPriority,
      clientName: name,
      clientTz: tz,
    });
    logActivity('יצר משימה מלקוח', `${name} → ${target?.name || ''}`);
    toast.success(`נוצרה משימה ל${target?.name || ''}`);
    setNewTaskOpen(false);
    setTick((t) => t + 1);
  };

  const valueChip = (label: string, val: string) => {
    const kind = statusKind(label);
    if (!val) return <span className="text-muted-foreground/30">—</span>;
    if (kind === 'done') return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">{val}</span>;
    if (kind === 'flag') return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">{val}</span>;
    return <span>{val}</span>;
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />טוען...</div>;

  if (tables.length === 0) {
    return (
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="p-10 text-center space-y-2">
          <Users className="h-10 w-10 text-primary/50 mx-auto" />
          <p className="font-bold">אין עדיין לקוחות</p>
          <p className="text-sm text-muted-foreground">ייבא טבלת לקוחות במסך "טבלאות", ואז הם יופיעו כאן.</p>
        </CardContent>
      </Card>
    );
  }

  // ===== Client personal area =====
  if (openClient && source) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setOpenId(null)}><ChevronRight className="h-5 w-5" /></Button>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black">{clientName(openClient).charAt(0)}</div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-primary truncate">{clientName(openClient)}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {idCol && <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{openClientIdValue || '—'}</span>}
              {phoneCol && String(openClient.data[phoneCol.key] ?? '') && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />{String(openClient.data[phoneCol.key] ?? '')}
                  <a href={waLink(String(openClient.data[phoneCol.key] ?? ''))} target="_blank" rel="noreferrer" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors" title="שלח וואטסאפ"><MessageCircle className="h-3.5 w-3.5" /></a>
                </span>
              )}
            </div>
          </div>
          <div className="ms-auto">
            <Button className="rounded-full gap-2" onClick={() => openNewTask(clientName(openClient))}><ClipboardList className="h-4 w-4" />צור משימה</Button>
          </div>
        </div>

        {/* Case status overview — the key statuses at a glance */}
        {(() => {
          const statusCols = source.columns.filter((c) => statusKind(c.label));
          if (statusCols.length === 0) return null;
          return (
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />מצב התיק</CardTitle>
                <CardDescription>סטטוס הדוח, החתימה, המסמכים והתשלום — במבט אחד.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {statusCols.map((c) => {
                    const val = String(openClient.data[c.key] ?? '').trim();
                    const kind = statusKind(c.label);
                    if (kind === 'flag') {
                      return (
                        <div key={c.key} className={cn('px-3 py-2 rounded-xl border text-sm flex items-center gap-2', val ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-700')}>
                          {val ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          <span className="font-bold">{c.label}:</span>{val || 'אין'}
                        </div>
                      );
                    }
                    return (
                      <div key={c.key} className={cn('px-3 py-2 rounded-xl border text-sm flex items-center gap-2', val ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted/40 border-border/50 text-muted-foreground')}>
                        {val ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        <span className="font-bold">{c.label}:</span>{val || 'טרם'}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Open tasks on this client */}
        {(() => {
          const _ = tick; // re-read after creating a task
          const ct = clientTasksFor(clientName(openClient));
          if (ct.length === 0) return null;
          return (
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />משימות פתוחות ({ct.length})</CardTitle>
                <CardDescription>משימות שנפתחו על הלקוח הזה.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {ct.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-background border border-border/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.task}</p>
                      <p className="text-[11px] text-muted-foreground">אחראי: {t.assigneeName || '—'}{t.assignedByName ? ` · מאת: ${t.assignedByName}` : ''}{t.dueDate ? ` · יעד ${t.dueDate}` : ''}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')}>
                      {t.priority === 'high' ? 'דחוף' : t.priority === 'medium' ? 'רגיל' : 'נמוך'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Full details from source table (editable) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />פרטי הלקוח · {source.name}</CardTitle>
            <CardDescription>לחיצה על ערך מאפשרת עריכה. עדכון נשמר לכולם.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {source.columns.map((c) => (
                <div key={c.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/50">
                  <span className="text-[11px] text-muted-foreground w-24 shrink-0 truncate">{c.label}</span>
                  <Input defaultValue={String(openClient.data[c.key] ?? '')} onBlur={(e) => saveField(openClient, c.key, e.target.value)} className="h-8 rounded-lg text-sm border-transparent hover:border-border focus:border-primary" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Related data from other tables (VAT / income tax / withholding, matched by ת"ז) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />מע"מ, מס הכנסה ונתונים נוספים</CardTitle>
            <CardDescription>נתונים מטבלאות אחרות שתואמים לת"ז של הלקוח.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {!idCol ? (
              <p className="text-sm text-muted-foreground text-center py-4">בטבלת המקור אין עמודת ת"ז, ולכן אי אפשר לקשר אוטומטית. נחבר ידנית כשנעבוד על הטבלה.</p>
            ) : loadingRelated ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" />מחפש נתונים מקושרים...</div>
            ) : related.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">לא נמצאו נתונים מקושרים לפי ת"ז בטבלאות האחרות.</p>
            ) : (
              related.map(({ table, rows: matched }) => (
                <div key={table.id} className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 text-sm font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" />{table.name}</div>
                  {matched.map((m) => (
                    <div key={m.id} className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-border/30">
                      {table.columns.filter((c) => String(m.data[c.key] ?? '').trim() !== '').map((c) => (
                        <div key={c.key} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">{c.label}:</span>
                          {valueChip(c.label, String(m.data[c.key] ?? ''))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Create-task dialog */}
        <Sheet open={newTaskOpen} onOpenChange={setNewTaskOpen}>
          <SheetContent side="left" className="w-[400px] max-w-full p-0" dir="rtl">
            <SheetHeader className="p-4 border-b bg-primary/5"><SheetTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />משימה חדשה · {clientName(openClient)}</SheetTitle></SheetHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">מה צריך לעשות?</label>
                <Input value={ntText} onChange={(e) => setNtText(e.target.value)} className="h-11 rounded-xl" placeholder="תיאור המשימה" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">למי מעבירים?</label>
                <div className="flex flex-wrap gap-2">
                  {employees.map((e) => (
                    <button key={e.id} onClick={() => setNtEmp(e.id)}
                      className={cn('px-4 h-10 rounded-full border text-sm font-medium transition-colors', ntEmp === e.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 hover:bg-primary/5')}>
                      {e.name}{myEmp?.id === e.id ? ' (אני)' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">עדיפות</label>
                <div className="flex gap-2">
                  {([['high', 'דחוף', 'bg-red-500 text-white border-red-500', 'text-red-600 border-red-200'], ['medium', 'רגיל', 'bg-orange-500 text-white border-orange-500', 'text-orange-600 border-orange-200'], ['low', 'נמוך', 'bg-blue-500 text-white border-blue-500', 'text-blue-600 border-blue-200']] as [any, string, string, string][]).map(([k, l, on, off]) => (
                    <button key={k} onClick={() => setNtPriority(k)} className={cn('px-4 h-10 rounded-full border text-sm font-bold transition-colors', ntPriority === k ? on : cn('bg-background', off))}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-full" onClick={() => setNewTaskOpen(false)}>ביטול</Button>
                <Button className="rounded-full gap-2" onClick={() => submitNewTask(clientName(openClient), openClientIdValue)}><Plus className="h-4 w-4" />צור משימה</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>
    );
  }

  // ===== Clients list =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2"><Users className="h-6 w-6" />לקוחות</h2>
          <p className="text-sm text-muted-foreground">מתוך הטבלה · לחץ על לקוח לאזור האישי שלו</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sourceId} onValueChange={setSourceId} items={Object.fromEntries(tables.map((t) => [t.id, t.name]))}>
            <SelectTrigger className="h-9 rounded-full w-56 text-xs"><SelectValue placeholder="מקור לקוחות" /></SelectTrigger>
            <SelectContent>{tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לקוח..." className="h-9 w-52 rounded-full pr-9" />
          </div>
        </div>
      </div>

      {loadingRows ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />טוען לקוחות...</div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} לקוחות{search && ` (מתוך ${rows.length})`}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 300).map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} className="text-right p-3 rounded-2xl border border-border/50 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">{clientName(r).charAt(0)}</div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{clientName(r)}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {idCol && (String(r.data[idCol.key] ?? '') || '—')}
                    {phoneCol && String(r.data[phoneCol.key] ?? '') ? ` · ${r.data[phoneCol.key]}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {filtered.length > 300 && <p className="text-xs text-muted-foreground text-center">מוצגים 300 הראשונים — השתמש בחיפוש כדי למצוא לקוח ספציפי.</p>}
        </>
      )}
    </div>
  );
}
