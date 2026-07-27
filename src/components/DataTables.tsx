import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table2, Upload, Search, Download, Plus, Trash2, ChevronRight, Loader2,
  ArrowUpDown, GripVertical, X, Database, RotateCcw,
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

// Columns treated as coloured status indicators.
const STATUS_WORDS = ['חסר', 'חתימה', 'מוכן', 'הוגש', 'טופל', 'שולם', 'דווח'];
const isStatusLabel = (label: string) => STATUS_WORDS.some((w) => label.includes(w));

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
  const [editing, setEditing] = useState<{ rowId: string; key: string } | null>(null);
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

  // Load rows + subscribe on selection.
  useEffect(() => {
    if (!selectedId) { setRows([]); return; }
    let off = () => {};
    setLoadingRows(true);
    getRows(selectedId)
      .then((r) => setRows(r))
      .catch((e) => toast.error('שגיאה בטעינת השורות', { description: e?.message }))
      .finally(() => setLoadingRows(false));
    off = subscribeRows(selectedId, () => { getRows(selectedId).then(setRows).catch(() => {}); });
    // load personal column order
    try {
      const saved = localStorage.getItem(`mas4u_cols_${uid}_${selectedId}`);
      setColOrder(saved ? JSON.parse(saved) : []);
    } catch { setColOrder([]); }
    return () => off();
  }, [selectedId, uid]);

  // Ordered columns for the current user (personal layout).
  const orderedCols: TableColumn[] = useMemo(() => {
    if (!selected) return [];
    const cols = selected.columns || [];
    if (!colOrder.length) return cols;
    const byKey = new Map(cols.map((c) => [c.key, c]));
    const out: TableColumn[] = [];
    colOrder.forEach((k) => { const c = byKey.get(k); if (c) { out.push(c); byKey.delete(k); } });
    byKey.forEach((c) => out.push(c)); // any new columns at the end
    return out;
  }, [selected, colOrder]);

  const saveColOrder = (keys: string[]) => {
    setColOrder(keys);
    try { localStorage.setItem(`mas4u_cols_${uid}_${selectedId}`, JSON.stringify(keys)); } catch { /* ignore */ }
  };
  const dragKey = useRef<string | null>(null);
  const onDropCol = (targetKey: string) => {
    const src = dragKey.current; dragKey.current = null;
    if (!src || src === targetKey) return;
    const cur = orderedCols.map((c) => c.key);
    const from = cur.indexOf(src), to = cur.indexOf(targetKey);
    cur.splice(to, 0, cur.splice(from, 1)[0]);
    saveColOrder(cur);
  };

  const filteredSorted = useMemo(() => {
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((r) => Object.values(r.data).some((v) => String(v ?? '').toLowerCase().includes(q)));
    if (sortCol) {
      out = [...out].sort((a, b) => {
        const av = String(a.data[sortCol] ?? ''), bv = String(b.data[sortCol] ?? '');
        const an = parseFloat(av.replace(/[^\d.-]/g, '')), bn = parseFloat(bv.replace(/[^\d.-]/g, ''));
        const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv, 'he');
        return cmp * sortDir;
      });
    }
    return out;
  }, [rows, search, sortCol, sortDir]);

  // Top summary stats from status columns.
  const stats = useMemo(() => {
    if (!selected) return [];
    const out: { label: string; count: number; total: number }[] = [{ label: 'סה"כ שורות', count: rows.length, total: rows.length }];
    (selected.columns || []).filter((c) => isStatusLabel(c.label)).slice(0, 5).forEach((c) => {
      const filled = rows.filter((r) => String(r.data[c.key] ?? '').trim() !== '').length;
      out.push({ label: c.label, count: filled, total: rows.length });
    });
    return out;
  }, [selected, rows]);

  const beginEdit = (rowId: string, key: string) => setEditing({ rowId, key });
  const commitEdit = async (rowId: string, key: string, value: string) => {
    setEditing(null);
    const row = rows.find((r) => r.id === rowId);
    if (!row || String(row.data[key] ?? '') === value) return;
    const newData = { ...row.data, [key]: value };
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, data: newData } : r)));
    try { await updateRow(rowId, newData); }
    catch (e: any) { toast.error('שמירת התא נכשלה', { description: e?.message }); getRows(selectedId!).then(setRows); }
  };

  const handleAddRow = async () => {
    if (!selected) return;
    const empty: Record<string, any> = {};
    selected.columns.forEach((c) => (empty[c.key] = ''));
    const pos = (rows[rows.length - 1]?.position ?? rows.length) + 1;
    try { const r = await addRow(selected.id, empty, pos); setRows((p) => [...p, r]); }
    catch (e: any) { toast.error('הוספת שורה נכשלה', { description: e?.message }); }
  };
  const handleDeleteRow = async (rowId: string) => {
    setRows((p) => p.filter((r) => r.id !== rowId));
    try { await deleteRow(rowId); } catch (e: any) { toast.error('מחיקת שורה נכשלה', { description: e?.message }); }
  };

  const exportTable = () => {
    if (!selected) return;
    const aoa = [orderedCols.map((c) => c.label), ...filteredSorted.map((r) => orderedCols.map((c) => r.data[c.key] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selected.name.slice(0, 30) || 'Sheet1');
    XLSX.writeFile(wb, `${selected.name}.xlsx`);
  };

  const handleDeleteTable = async () => {
    if (!selected) return;
    if (!window.confirm(`למחוק את הטבלה "${selected.name}" וכל השורות שלה? פעולה בלתי הפיכה.`)) return;
    try {
      await deleteTable(selected.id);
      logActivity('מחק טבלה', selected.name);
      setSelectedId(null);
      refreshTables();
    } catch (e: any) { toast.error('מחיקת הטבלה נכשלה', { description: e?.message }); }
  };

  // ---- Import flow ----
  const onPickFile = async (file: File) => {
    try {
      const sheets = await parseWorkbook(file);
      const prepared = sheets
        .filter((s) => s.matrix.length > 1)
        .map((s) => ({ ...s, include: true, dataStart: 1, name: `${file.name.replace(/\.xlsx?$/i, '')} — ${s.sheetName}` }));
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
        await insertRows(t.id, data.map((d, i) => ({ data: d, position: i })), (done, total) => {
          setImportProgress(`${s.name}: ${done}/${total} שורות`);
        });
        created++;
      }
      toast.success(`יובאו ${created} טבלאות בהצלחה`);
      logActivity('ייבא טבלאות מאקסל', importer.fileName);
      setImporter(null);
      await refreshTables();
    } catch (e: any) {
      toast.error('הייבוא נכשל', { description: e?.message });
    } finally { setImporting(false); setImportProgress(''); }
  };

  // ================= RENDER =================

  // Importer modal
  if (importer) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />ייבוא מאקסל: {importer.fileName}</CardTitle>
            <CardDescription>בחר אילו גליונות לייבא ומאיזו שורה מתחילים הנתונים. כל גיליון = טבלה נפרדת.</CardDescription>
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
              {/* preview */}
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
              <p className="text-[11px] text-muted-foreground">
                {buildColumns(s.matrix[0] || []).length} עמודות · ~{buildRows(s.matrix, buildColumns(s.matrix[0] || []), s.dataStart).length} שורות
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{importProgress}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setImporter(null)} disabled={importing}>ביטול</Button>
              <Button className="rounded-full gap-2" onClick={runImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}ייבא
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Table detail
  if (selected) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedId(null)}><ChevronRight className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-black text-primary">{selected.name}</h2>
            <Badge variant="secondary" className="text-[10px]">{rows.length} שורות</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש בטבלה..." className="h-9 w-48 rounded-full pr-9" />
            </div>
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleAddRow}><Plus className="h-4 w-4" />שורה</Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={exportTable}><Download className="h-4 w-4" />ייצוא</Button>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-red-500" onClick={handleDeleteTable} title="מחק טבלה"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Top summary stats */}
        <div className="flex flex-wrap gap-2">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-2 rounded-2xl border border-border/50 bg-background text-center min-w-[110px]">
              <div className="text-xl font-black text-primary">{s.count}{s.label !== 'סה"כ שורות' && <span className="text-xs text-muted-foreground">/{s.total}</span>}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
          {colOrder.length > 0 && (
            <button onClick={() => saveColOrder([])} className="px-3 py-2 rounded-2xl border border-border/50 bg-background text-[11px] text-muted-foreground flex items-center gap-1 hover:bg-muted/50">
              <RotateCcw className="h-3 w-3" />איפוס סדר עמודות
            </button>
          )}
        </div>

        {loadingRows ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />טוען...</div>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="text-xs w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-2 py-2 text-muted-foreground font-normal w-8"></th>
                    {orderedCols.map((c) => (
                      <th
                        key={c.key}
                        draggable
                        onDragStart={() => (dragKey.current = c.key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropCol(c.key)}
                        className="px-3 py-2 text-right font-bold whitespace-nowrap cursor-grab active:cursor-grabbing border-e border-border/30 select-none group"
                        title="גרור לשינוי סדר · לחץ למיון"
                      >
                        <span className="inline-flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
                          <button className="inline-flex items-center gap-1" onClick={() => { setSortCol(c.key); setSortDir((d) => (sortCol === c.key ? (d === 1 ? -1 : 1) : 1)); }}>
                            {c.label}
                            {sortCol === c.key && <ArrowUpDown className="h-3 w-3 text-primary" />}
                          </button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((r) => (
                    <tr key={r.id} className="border-t border-border/30 hover:bg-primary/5 group">
                      <td className="px-1 text-center">
                        <button className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteRow(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                      {orderedCols.map((c) => {
                        const val = String(r.data[c.key] ?? '');
                        const status = isStatusLabel(c.label);
                        const isEditing = editing?.rowId === r.id && editing?.key === c.key;
                        return (
                          <td
                            key={c.key}
                            className="px-3 py-1.5 border-e border-border/20 whitespace-nowrap max-w-[220px]"
                            onClick={() => !isEditing && beginEdit(r.id, c.key)}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                defaultValue={val}
                                onBlur={(e) => commitEdit(r.id, c.key, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
                                className="w-full min-w-[80px] bg-background border border-primary/40 rounded px-1 py-0.5 outline-none"
                              />
                            ) : status ? (
                              val ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{val}</span>
                                  : <span className="text-muted-foreground/40">—</span>
                            ) : (
                              <span className="truncate inline-block max-w-[210px] align-bottom">{val || <span className="text-muted-foreground/30">—</span>}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filteredSorted.length === 0 && (
                    <tr><td colSpan={orderedCols.length + 1} className="text-center text-muted-foreground py-10">אין שורות להצגה</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-[11px] text-muted-foreground">טיפ: לחץ על תא לעריכה · גרור כותרת עמודה לשינוי הסדר (אישי לך) · לחץ כותרת למיון.</p>
      </motion.div>
    );
  }

  // Tables list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2"><Database className="h-6 w-6" />הטבלאות שלי</h2>
          <p className="text-sm text-muted-foreground">כל טבלה בנפרד · נתונים משותפים לכל הצוות · סידור עמודות אישי לכל עובד</p>
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
            <p className="text-sm text-muted-foreground">לחץ "ייבוא מאקסל" כדי להעלות את הקבצים שלך — כל גיליון יהפוך לטבלה נפרדת.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className="text-right p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 font-bold"><Table2 className="h-4 w-4 text-primary" />{t.name}</div>
              <p className="text-xs text-muted-foreground mt-1">{(t.columns || []).length} עמודות</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
