import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table2, Upload, Search, Download, Plus, Trash2, ChevronRight, Loader2,
  ArrowUp, ArrowDown, X, Database, RotateCcw, SlidersHorizontal, Check,
  Users, FileCheck2, FileClock, PenLine, FileWarning, ChevronUp, ChevronDown, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { User } from '@/src/types';
import {
  DataTableMeta, DataRow, TableColumn,
  listTables, createTable, deleteTable, getRows, insertRows, updateRow, addRow, deleteRow, subscribeRows,
} from '@/src/lib/dataTables';
import { parseWorkbook, buildColumns, buildRows, ParsedSheet } from '@/src/lib/excelImport';
import { logActivity } from '@/src/lib/mockData';

// Column semantics for coloring.
const DONE_WORDS = ['חתימה', 'מוכן', 'הוגש', 'טופל', 'שולם', 'דווח', 'שודר'];
const FLAG_WORDS = ['חסר'];
const IMPORTANT = ['משפחה', 'פרטי', 'שם', 'ת"ז', 'מספר', 'שקית', 'טלפון', 'ווצאפ', 'מהות', 'שכ"ט', 'שולם', 'חסר', 'חתימה', 'מוכן', 'הוגש', 'טופל', 'עדיפות', 'קוד', 'דווח', 'תאריך', 'הערות', 'עיסוק'];
const statusKind = (label: string): 'done' | 'flag' | null =>
  FLAG_WORDS.some((w) => label.includes(w)) ? 'flag' : DONE_WORDS.some((w) => label.includes(w)) ? 'done' : null;

type StatColor = 'primary' | 'green' | 'blue' | 'amber' | 'red';
interface StatCard {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
  match: (r: DataRow) => boolean;
  count?: number;
}
// Palette per stat color: [number text, icon bg, active ring+bg].
const STAT_STYLES: Record<StatColor, { num: string; chip: string; active: string; idle: string }> = {
  primary: { num: 'text-primary', chip: 'bg-primary/10 text-primary', active: 'border-primary/40 bg-primary/5 ring-1 ring-primary/30', idle: 'border-border/50 bg-card hover:border-primary/30' },
  green:   { num: 'text-green-600', chip: 'bg-green-100 text-green-700', active: 'border-green-300 bg-green-50 ring-1 ring-green-300', idle: 'border-border/50 bg-card hover:border-green-300' },
  blue:    { num: 'text-blue-600', chip: 'bg-blue-100 text-blue-700', active: 'border-blue-300 bg-blue-50 ring-1 ring-blue-300', idle: 'border-border/50 bg-card hover:border-blue-300' },
  amber:   { num: 'text-amber-600', chip: 'bg-amber-100 text-amber-700', active: 'border-amber-300 bg-amber-50 ring-1 ring-amber-300', idle: 'border-border/50 bg-card hover:border-amber-300' },
  red:     { num: 'text-red-600', chip: 'bg-red-100 text-red-700', active: 'border-red-300 bg-red-50 ring-1 ring-red-300', idle: 'border-border/50 bg-card hover:border-red-300' },
};

interface DataTablesProps { currentUser?: User | null; }

export function DataTables({ currentUser }: DataTablesProps) {
  const [tables, setTables] = useState<DataTableMeta[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [colOrder, setColOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showColPanel, setShowColPanel] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [detailRow, setDetailRow] = useState<DataRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [importer, setImporter] = useState<null | { fileName: string; sheets: (ParsedSheet & { include: boolean; dataStart: number; name: string })[] }>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = tables.find((t) => t.id === selectedId) || null;
  const uid = currentUser?.id || 'anon';

  const refreshTables = async () => {
    setLoadingTables(true);
    try { setTables(await listTables()); }
    catch (e: any) { toast.error('שגיאה בטעינת הטבלאות', { description: e?.message }); }
    finally { setLoadingTables(false); }
  };
  useEffect(() => { refreshTables(); }, []);

  useEffect(() => {
    if (!selectedId) { setRows([]); return; }
    let off = () => {};
    setLoadingRows(true);
    getRows(selectedId).then(setRows).catch((e) => toast.error('שגיאה בטעינת השורות', { description: e?.message })).finally(() => setLoadingRows(false));
    off = subscribeRows(selectedId, () => { getRows(selectedId).then(setRows).catch(() => {}); });
    try {
      const o = localStorage.getItem(`mas4u_cols_${uid}_${selectedId}`);
      setColOrder(o ? JSON.parse(o) : []);
      const h = localStorage.getItem(`mas4u_hide_${uid}_${selectedId}`);
      setHidden(new Set(h ? JSON.parse(h) : defaultHidden(tables.find((t) => t.id === selectedId))));
    } catch { setColOrder([]); setHidden(new Set()); }
    setSortCol(null); setSearch(''); setStatusFilter(null);
    return () => off();
  }, [selectedId, uid]);

  function defaultHidden(t?: DataTableMeta): string[] {
    if (!t) return [];
    const cols = t.columns || [];
    if (cols.length <= 8) return [];
    // Hide columns that aren't among the first 5 and aren't "important".
    return cols.filter((c, i) => i >= 5 && !IMPORTANT.some((w) => c.label.includes(w))).map((c) => c.key);
  }

  const allCols = selected?.columns || [];
  const orderedCols: TableColumn[] = useMemo(() => {
    if (!selected) return [];
    if (!colOrder.length) return allCols;
    const byKey = new Map(allCols.map((c) => [c.key, c]));
    const out: TableColumn[] = [];
    colOrder.forEach((k) => { const c = byKey.get(k); if (c) { out.push(c); byKey.delete(k); } });
    byKey.forEach((c) => out.push(c));
    return out;
  }, [selected, colOrder, allCols]);
  const visibleCols = orderedCols.filter((c) => !hidden.has(c.key));

  const saveColOrder = (keys: string[]) => { setColOrder(keys); try { localStorage.setItem(`mas4u_cols_${uid}_${selectedId}`, JSON.stringify(keys)); } catch {} };
  const saveHidden = (s: Set<string>) => { setHidden(new Set(s)); try { localStorage.setItem(`mas4u_hide_${uid}_${selectedId}`, JSON.stringify([...s])); } catch {} };
  const toggleHidden = (key: string) => { const s = new Set(hidden); s.has(key) ? s.delete(key) : s.add(key); saveHidden(s); };

  // Move a column one step earlier/later in the personal order.
  const moveCol = (key: string, dir: -1 | 1) => {
    const cur = orderedCols.map((c) => c.key);
    const from = cur.indexOf(key);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= cur.length) return;
    [cur[from], cur[to]] = [cur[to], cur[from]];
    saveColOrder(cur);
  };
  const setAllHidden = (hide: boolean) => {
    // Keep the first (name) column always visible.
    if (hide) saveHidden(new Set(orderedCols.slice(1).map((c) => c.key)));
    else saveHidden(new Set());
  };

  const findCol = (word: string) => allCols.find((c) => c.label.includes(word));

  // Status columns + per-row predicates (shared by the stat chips and the filter).
  const statusCards = useMemo(() => {
    if (!selected) return [] as StatCard[];
    const has = (r: DataRow, col?: TableColumn) => !!col && String(r.data[col.key] ?? '').trim() !== '';
    const cHogash = findCol('הוגש'), cHaser = findCol('חסר'), cMuchan = findCol('מוכן'), cHatima = findCol('חתימה');
    const cards: StatCard[] = [
      { key: 'all', label: 'סה"כ', icon: Users, color: 'primary', match: () => true },
    ];
    if (cHogash) cards.push({ key: 'hogash', label: 'הוגשו', icon: FileCheck2, color: 'green', match: (r) => has(r, cHogash) });
    if (cMuchan) cards.push({ key: 'muchan', label: 'מוכנים', icon: FileClock, color: 'blue', match: (r) => has(r, cMuchan) });
    if (cMuchan && cHatima && cHogash) cards.push({ key: 'onlysig', label: 'חסר רק חתימה', icon: PenLine, color: 'amber', match: (r) => has(r, cMuchan) && !has(r, cHatima) && !has(r, cHogash) });
    if (cHaser) cards.push({ key: 'haser', label: 'חסרים מסמכים', icon: FileWarning, color: 'red', match: (r) => has(r, cHaser) });
    return cards.map((c) => ({ ...c, count: rows.filter(c.match).length }));
  }, [selected, rows, allCols]);

  const filteredSorted = useMemo(() => {
    let out = rows;
    const active = statusFilter ? statusCards.find((c) => c.key === statusFilter) : null;
    if (active) out = out.filter(active.match);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((r) => Object.values(r.data).some((v) => String(v ?? '').toLowerCase().includes(q)));
    if (sortCol) {
      out = [...out].sort((a, b) => {
        const av = String(a.data[sortCol] ?? ''), bv = String(b.data[sortCol] ?? '');
        const an = parseFloat(av.replace(/[^\d.-]/g, '')), bn = parseFloat(bv.replace(/[^\d.-]/g, ''));
        const cmp = (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '') ? an - bn : av.localeCompare(bv, 'he');
        return cmp * sortDir;
      });
    }
    return out;
  }, [rows, search, sortCol, sortDir, statusFilter, statusCards]);

  const commitCell = async (rowId: string, key: string, value: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row || String(row.data[key] ?? '') === value) return;
    const newData = { ...row.data, [key]: value };
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, data: newData } : r)));
    if (detailRow?.id === rowId) setDetailRow({ ...detailRow, data: newData });
    try { await updateRow(rowId, newData); }
    catch (e: any) { toast.error('שמירת התא נכשלה', { description: e?.message }); getRows(selectedId!).then(setRows); }
  };

  const handleAddRow = async () => {
    if (!selected) return;
    const empty: Record<string, any> = {}; selected.columns.forEach((c) => (empty[c.key] = ''));
    const pos = (rows[rows.length - 1]?.position ?? rows.length) + 1;
    try { const r = await addRow(selected.id, empty, pos); setRows((p) => [...p, r]); setDetailRow(r); }
    catch (e: any) { toast.error('הוספת שורה נכשלה', { description: e?.message }); }
  };
  const handleDeleteRow = async (rowId: string) => {
    setRows((p) => p.filter((r) => r.id !== rowId));
    if (detailRow?.id === rowId) setDetailRow(null);
    try { await deleteRow(rowId); } catch (e: any) { toast.error('מחיקת שורה נכשלה', { description: e?.message }); }
  };

  const exportTable = () => {
    if (!selected) return;
    const aoa = [visibleCols.map((c) => c.label), ...filteredSorted.map((r) => visibleCols.map((c) => r.data[c.key] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (selected.name || 'Sheet1').slice(0, 30));
    XLSX.writeFile(wb, `${selected.name}.xlsx`);
  };
  const handleDeleteTable = async () => {
    if (!selected) return;
    if (!window.confirm(`למחוק את הטבלה "${selected.name}" וכל השורות שלה? פעולה בלתי הפיכה.`)) return;
    try { await deleteTable(selected.id); logActivity('מחק טבלה', selected.name); setSelectedId(null); refreshTables(); }
    catch (e: any) { toast.error('מחיקת הטבלה נכשלה', { description: e?.message }); }
  };

  // Import
  const onPickFile = async (file: File) => {
    try {
      const sheets = await parseWorkbook(file);
      const prepared = sheets.filter((s) => s.matrix.length > 1).map((s) => ({ ...s, include: true, dataStart: 1, name: `${file.name.replace(/\.xlsx?$/i, '')} — ${s.sheetName}` }));
      setImporter({ fileName: file.name, sheets: prepared });
    } catch (e: any) { toast.error('קריאת האקסל נכשלה', { description: e?.message }); }
  };
  const runImport = async () => {
    if (!importer) return;
    setImporting(true);
    try {
      let created = 0;
      for (const s of importer.sheets.filter((x) => x.include)) {
        const cols = buildColumns(s.matrix[0] || []);
        const data = buildRows(s.matrix, cols, s.dataStart);
        setImportProgress(`יוצר טבלה: ${s.name}...`);
        const t = await createTable(s.name, cols, tables.length + created);
        await insertRows(t.id, data.map((d, i) => ({ data: d, position: i })), (done, total) => setImportProgress(`${s.name}: ${done}/${total} שורות`));
        created++;
      }
      toast.success(`יובאו ${created} טבלאות בהצלחה`);
      logActivity('ייבא טבלאות מאקסל', importer.fileName);
      setImporter(null); await refreshTables();
    } catch (e: any) { toast.error('הייבוא נכשל', { description: e?.message }); }
    finally { setImporting(false); setImportProgress(''); }
  };

  const cellDisplay = (label: string, val: string) => {
    const kind = statusKind(label);
    if (!val) return kind === 'done'
      ? <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-muted-foreground/25 text-transparent">·</span>
      : <span className="text-muted-foreground/25">—</span>;
    if (kind === 'done') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 ring-1 ring-green-600/20 text-[11px] font-bold whitespace-nowrap"><Check className="h-3 w-3" />{val}</span>;
    if (kind === 'flag') return <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-600/20 text-[11px] font-medium max-w-[180px] truncate align-bottom" title={val}>{val}</span>;
    return <span className="truncate inline-block max-w-[220px] align-bottom">{val}</span>;
  };

  // ===== Importer view =====
  if (importer) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />ייבוא מאקסל: {importer.fileName}</CardTitle>
            <CardDescription>כל גיליון = טבלה נפרדת. קבע מאיזו שורה מתחילים הנתונים (שורות מסומנות בקו חוצה יידלגו).</CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setImporter(null)} disabled={importing}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {importer.sheets.map((s, si) => (
            <div key={si} className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 font-bold">
                  <input type="checkbox" checked={s.include} onChange={(e) => setImporter((im) => im && { ...im, sheets: im.sheets.map((x, i) => i === si ? { ...x, include: e.target.checked } : x) })} className="h-4 w-4" />
                  {s.sheetName}
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">שם הטבלה:</span>
                  <Input value={s.name} onChange={(e) => setImporter((im) => im && { ...im, sheets: im.sheets.map((x, i) => i === si ? { ...x, name: e.target.value } : x) })} className="h-8 w-56 rounded-lg" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">שורת נתונים ראשונה:</span>
                  <Input type="number" min={1} value={s.dataStart + 1} onChange={(e) => setImporter((im) => im && { ...im, sheets: im.sheets.map((x, i) => i === si ? { ...x, dataStart: Math.max(1, (parseInt(e.target.value) || 2) - 1) } : x) })} className="h-8 w-16 rounded-lg" dir="ltr" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="text-[11px] w-full">
                  <tbody>
                    {s.matrix.slice(0, Math.max(s.dataStart + 2, 4)).map((r, ri) => (
                      <tr key={ri} className={cn(ri === 0 ? 'bg-primary/5 font-bold' : ri < s.dataStart ? 'bg-muted/40 text-muted-foreground line-through' : 'bg-background')}>
                        {(r as any[]).slice(0, 12).map((c, ci) => <td key={ci} className="px-2 py-1 border-e border-border/30 whitespace-nowrap max-w-[120px] truncate">{String(c ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">{buildColumns(s.matrix[0] || []).length} עמודות · ~{buildRows(s.matrix, buildColumns(s.matrix[0] || []), s.dataStart).length} שורות</p>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{importProgress}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setImporter(null)} disabled={importing}>ביטול</Button>
              <Button className="rounded-full gap-2" onClick={runImport} disabled={importing}>{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}ייבא</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ===== Table detail view =====
  if (selected) {
    const customized = hidden.size > 0 || colOrder.length > 0;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Header + toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setSelectedId(null)} title="חזרה לרשימת הטבלאות"><ChevronRight className="h-5 w-5" /></Button>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-primary truncate">{selected.name}</h2>
              <p className="text-[11px] text-muted-foreground">{rows.length.toLocaleString('he-IL')} שורות · {visibleCols.length}/{allCols.length} עמודות מוצגות</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש בטבלה..." className="h-9 w-48 rounded-full pr-9" />
              {search && <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => { setColSearch(''); setShowColPanel(true); }}>
              <SlidersHorizontal className="h-4 w-4" />עמודות{hidden.size > 0 && <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 leading-tight py-0.5">{hidden.size} מוסתרות</span>}
            </Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleAddRow}><Plus className="h-4 w-4" />שורה</Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={exportTable}><Download className="h-4 w-4" />ייצוא</Button>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={handleDeleteTable} title="מחק טבלה"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Clickable status filters */}
        <div className="flex flex-wrap gap-2">
          {statusCards.map((s) => {
            const st = STAT_STYLES[s.color];
            const active = statusFilter === s.key || (s.key === 'all' && !statusFilter);
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key === 'all' ? null : (statusFilter === s.key ? null : s.key))}
                className={cn('flex items-center gap-2.5 pl-4 pr-2.5 py-2 rounded-2xl border text-right transition-all', active ? st.active : st.idle)}
                title={s.key === 'all' ? 'הצג הכל' : `סנן: ${s.label}`}
              >
                <span className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', st.chip)}><Icon className="h-[18px] w-[18px]" /></span>
                <span className="leading-none">
                  <span className={cn('block text-xl font-black', st.num)}>{(s.count ?? 0).toLocaleString('he-IL')}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{s.label}</span>
                </span>
              </button>
            );
          })}
          {customized && (
            <button onClick={() => { saveColOrder([]); saveHidden(new Set(defaultHidden(selected))); }} className="self-stretch px-3 rounded-2xl border border-dashed border-border/60 bg-background/50 text-[11px] text-muted-foreground flex items-center gap-1.5 hover:bg-muted/50 hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" />איפוס תצוגה
            </button>
          )}
        </div>

        {/* Active-filter banner */}
        {(statusFilter || search) && !loadingRows && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-1">
            <span>מציג <b className="text-foreground">{filteredSorted.length.toLocaleString('he-IL')}</b> מתוך {rows.length.toLocaleString('he-IL')}</span>
            <button onClick={() => { setStatusFilter(null); setSearch(''); }} className="inline-flex items-center gap-1 text-primary hover:underline"><X className="h-3 w-3" />נקה סינון</button>
          </div>
        )}

        {loadingRows ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />טוען...</div>
        ) : (
          <Card className="border border-border/50 shadow-sm overflow-hidden rounded-2xl">
            <div className="overflow-auto max-h-[72vh]">
              <table className="text-[13px] w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                    <th className="w-10 px-1 py-2.5 sticky right-0 z-30 bg-muted/95 backdrop-blur"></th>
                    {visibleCols.map((c, idx) => {
                      const sorted = sortCol === c.key;
                      return (
                        <th
                          key={c.key}
                          className={cn(
                            'px-3 py-2.5 text-right font-bold whitespace-nowrap border-e border-border/40 select-none',
                            idx === 0 && 'sticky right-10 z-20 bg-muted/95 backdrop-blur shadow-[6px_0_6px_-4px_rgba(0,0,0,0.12)]',
                            sorted && 'text-primary',
                          )}
                        >
                          <button
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={() => { setSortCol(c.key); setSortDir((d) => (sortCol === c.key ? (d === 1 ? -1 : 1) : 1)); }}
                            title="לחץ למיון"
                          >
                            {c.label}
                            {sorted
                              ? (sortDir === 1 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
                              : <ArrowUp className="h-3 w-3 text-muted-foreground/25" />}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((r, ri) => (
                    <tr key={r.id} className={cn('border-t border-border/30 hover:bg-primary/[0.06] transition-colors group/row', ri % 2 && 'bg-muted/20')}>
                      <td className={cn('w-10 px-0 text-center align-middle sticky right-0 z-10', ri % 2 ? 'bg-muted/20' : 'bg-background', 'group-hover/row:bg-primary/[0.06]')}>
                        <button className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10" onClick={() => setDetailRow(r)} title="פתח כרטיס מלא"><Maximize2 className="h-3.5 w-3.5" /></button>
                      </td>
                      {visibleCols.map((c, idx) => {
                        const val = String(r.data[c.key] ?? '');
                        return (
                          <EditableCell
                            key={c.key}
                            value={val}
                            sticky={idx === 0}
                            zebra={!!(ri % 2)}
                            onCommit={(v) => commitCell(r.id, c.key, v)}
                            render={() => cellDisplay(c.label, val)}
                          />
                        );
                      })}
                    </tr>
                  ))}
                  {filteredSorted.length === 0 && (
                    <tr><td colSpan={visibleCols.length + 1} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2"><Search className="h-6 w-6 text-muted-foreground/30" />אין שורות להצגה{(statusFilter || search) && <button onClick={() => { setStatusFilter(null); setSearch(''); }} className="text-primary text-xs hover:underline">נקה סינון</button>}</div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-[11px] text-muted-foreground">טיפ: לחץ תא לעריכה מהירה · <Maximize2 className="h-3 w-3 inline align-[-1px]" /> לפתיחת כרטיס מלא · לחץ כותרת למיון · לחץ על כרטיסי הסטטוס למעלה כדי לסנן · "עמודות" לבחירה וסידור אישי.</p>

        {/* Column chooser + reorder */}
        <Sheet open={showColPanel} onOpenChange={setShowColPanel}>
          <SheetContent side="left" className="w-[360px] max-w-full p-0 flex flex-col" dir="rtl">
            <SheetHeader className="p-4 border-b bg-primary/5">
              <SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />עמודות וסידור</SheetTitle>
            </SheetHeader>
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input value={colSearch} onChange={(e) => setColSearch(e.target.value)} placeholder="חיפוש עמודה..." className="h-9 rounded-full pr-9" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{orderedCols.length - hidden.size} מוצגות · {hidden.size} מוסתרות</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px] px-3" onClick={() => setAllHidden(false)}>הצג הכל</Button>
                  <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px] px-3" onClick={() => setAllHidden(true)}>הסתר הכל</Button>
                </div>
              </div>
            </div>
            <div className="p-2 space-y-0.5 overflow-y-auto flex-1">
              <p className="text-[11px] text-muted-foreground px-2 py-1.5">התצוגה אישית לך בלבד — הנתונים עצמם משותפים לכל הצוות. השתמש בחיצים לסידור.</p>
              {orderedCols
                .map((c, realIdx) => ({ c, realIdx }))
                .filter(({ c }) => !colSearch.trim() || c.label.toLowerCase().includes(colSearch.trim().toLowerCase()))
                .map(({ c, realIdx }) => {
                  const visible = !hidden.has(c.key);
                  const canReorder = !colSearch.trim();
                  return (
                    <div key={c.key} className={cn('flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-muted/60', !visible && 'opacity-55')}>
                      <button onClick={() => toggleHidden(c.key)} className="flex items-center gap-2 flex-1 min-w-0 text-right">
                        <span className={cn('h-5 w-5 rounded-md border flex items-center justify-center shrink-0', visible ? 'bg-primary border-primary text-white' : 'border-border')}>
                          {visible && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-sm truncate">{c.label}{realIdx === 0 && <span className="text-[10px] text-muted-foreground mr-1">(עמודה ראשית)</span>}</span>
                      </button>
                      <div className="flex flex-col shrink-0">
                        <button disabled={!canReorder || realIdx === 0} onClick={() => moveCol(c.key, -1)} className="h-3.5 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:hover:bg-transparent" title="הזז ימינה"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button disabled={!canReorder || realIdx === orderedCols.length - 1} onClick={() => moveCol(c.key, 1)} className="h-3.5 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:hover:bg-transparent" title="הזז שמאלה"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="p-3 border-t flex items-center justify-between gap-2">
              <button onClick={() => { saveColOrder([]); saveHidden(new Set(defaultHidden(selected))); }} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" />איפוס לברירת מחדל</button>
              <Button size="sm" className="rounded-full" onClick={() => setShowColPanel(false)}>סיום</Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Row detail drawer */}
        <Sheet open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
          <SheetContent side="left" className="w-[420px] max-w-full p-0" dir="rtl">
            <SheetHeader className="p-4 border-b bg-primary/5"><SheetTitle>כרטיס שורה</SheetTitle></SheetHeader>
            {detailRow && (
              <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
                {orderedCols.map((c) => (
                  <div key={c.key} className="grid grid-cols-3 items-center gap-2">
                    <label className="text-xs text-muted-foreground col-span-1">{c.label}</label>
                    <Input
                      defaultValue={String(detailRow.data[c.key] ?? '')}
                      onBlur={(e) => commitCell(detailRow.id, c.key, e.target.value)}
                      className="h-9 rounded-lg col-span-2 text-sm"
                    />
                  </div>
                ))}
                <div className="pt-2 flex justify-between">
                  <Button variant="ghost" className="text-red-500 gap-2 rounded-full" onClick={() => handleDeleteRow(detailRow.id)}><Trash2 className="h-4 w-4" />מחק שורה</Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setDetailRow(null)}>סגור</Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </motion.div>
    );
  }

  // ===== Tables list =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2"><Database className="h-6 w-6" />הטבלאות שלי</h2>
          <p className="text-sm text-muted-foreground">כל טבלה בנפרד · נתונים משותפים לכל הצוות · תצוגת עמודות אישית לכל עובד</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.currentTarget.value = ''; }} />
          <Button className="rounded-full gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />ייבוא מאקסל</Button>
        </div>
      </div>
      {loadingTables ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />טוען טבלאות...</div>
      ) : tables.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="p-10 text-center space-y-3">
            <Table2 className="h-10 w-10 text-primary/50 mx-auto" />
            <p className="font-bold">עדיין אין טבלאות</p>
            <p className="text-sm text-muted-foreground">לחץ "ייבוא מאקסל" — כל גיליון יהפוך לטבלה נפרדת.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className="text-right p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all group">
              <div className="flex items-center gap-2 font-bold"><div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><Table2 className="h-4 w-4" /></div>{t.name}</div>
              <p className="text-xs text-muted-foreground mt-2">{(t.columns || []).length} עמודות</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Editable cell — click to edit inline; blur/Enter to save.
function EditableCell({ value, onCommit, render, sticky, zebra }: { value: string; onCommit: (v: string) => void; render: () => React.ReactNode; sticky?: boolean; zebra?: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <td
      className={cn(
        'px-3 py-2 border-e border-border/20 whitespace-nowrap max-w-[240px] cursor-text transition-colors',
        !editing && 'hover:bg-primary/10 hover:ring-1 hover:ring-inset hover:ring-primary/30',
        sticky && cn('sticky right-10 z-10 font-semibold shadow-[6px_0_6px_-4px_rgba(0,0,0,0.10)]', zebra ? 'bg-muted/20' : 'bg-background', 'group-hover/row:bg-primary/[0.06]'),
      )}
      onClick={() => !editing && setEditing(true)}
      title={editing ? undefined : 'לחץ לעריכה'}
    >
      {editing ? (
        <input
          autoFocus
          defaultValue={value}
          onBlur={(e) => { setEditing(false); onCommit(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
          className="w-full min-w-[110px] bg-background border-2 border-primary/60 rounded-md px-1.5 py-1 outline-none text-[13px] shadow-sm"
        />
      ) : render()}
    </td>
  );
}
