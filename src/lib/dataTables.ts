import { supabase } from './supabaseClient';

/**
 * Data-tables engine (annual reports, exempt dealers, assignments, ...).
 * Each uploaded table is a row in `data_tables`; each data row is a separate
 * row in `data_rows`, so many employees can edit different rows concurrently
 * without overwriting each other, and it scales to thousands of rows.
 */

export interface TableColumn {
  key: string;
  label: string;
}

export interface DataTableMeta {
  id: string;
  name: string;
  columns: TableColumn[];
  sort_order?: number;
  created_at?: string;
}

export interface DataRow {
  id: string;
  table_id: string;
  data: Record<string, any>;
  position: number;
  updated_at?: string;
}

const ready = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};

export async function listTables(): Promise<DataTableMeta[]> {
  const { data, error } = await ready()
    .from('data_tables')
    .select('id,name,columns,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as DataTableMeta[];
}

export async function createTable(name: string, columns: TableColumn[], sortOrder = 0): Promise<DataTableMeta> {
  const { data, error } = await ready()
    .from('data_tables')
    .insert({ name, columns, sort_order: sortOrder })
    .select('id,name,columns,sort_order,created_at')
    .single();
  if (error) throw error;
  return data as DataTableMeta;
}

export async function deleteTable(tableId: string): Promise<void> {
  const { error } = await ready().from('data_tables').delete().eq('id', tableId);
  if (error) throw error;
}

export async function renameTable(tableId: string, name: string): Promise<void> {
  const { error } = await ready().from('data_tables').update({ name }).eq('id', tableId);
  if (error) throw error;
}

export async function updateTableColumns(tableId: string, columns: TableColumn[]): Promise<void> {
  const { error } = await ready().from('data_tables').update({ columns }).eq('id', tableId);
  if (error) throw error;
}

/** Fetch all rows for a table (paged to handle thousands). */
export async function getRows(tableId: string): Promise<DataRow[]> {
  const client = ready();
  const pageSize = 1000;
  let from = 0;
  const all: DataRow[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client
      .from('data_rows')
      .select('id,table_id,data,position,updated_at')
      .eq('table_id', tableId)
      .order('position', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...((data || []) as DataRow[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/** Bulk insert rows in chunks. rows: array of { data, position }. */
export async function insertRows(
  tableId: string,
  rows: { data: Record<string, any>; position: number }[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const client = ready();
  const chunk = 400;
  let done = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk).map((r) => ({ table_id: tableId, data: r.data, position: r.position }));
    const { error } = await client.from('data_rows').insert(slice);
    if (error) throw error;
    done += slice.length;
    onProgress?.(done, rows.length);
  }
  return done;
}

export async function updateRow(rowId: string, data: Record<string, any>): Promise<void> {
  const { error } = await ready()
    .from('data_rows')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', rowId);
  if (error) throw error;
}

export async function addRow(tableId: string, data: Record<string, any>, position: number): Promise<DataRow> {
  const { data: row, error } = await ready()
    .from('data_rows')
    .insert({ table_id: tableId, data, position })
    .select('id,table_id,data,position,updated_at')
    .single();
  if (error) throw error;
  return row as DataRow;
}

export async function deleteRow(rowId: string): Promise<void> {
  const { error } = await ready().from('data_rows').delete().eq('id', rowId);
  if (error) throw error;
}

/** Find the "ID number" (ת"ז) column of a table, if any. */
export function findIdColumn(columns: TableColumn[]): TableColumn | null {
  const c = columns.find((x) => /ת"?ז|ת\.ז|תעודת זהות/.test(x.label) || x.label === 'ם' || x.label.includes('ח.פ'));
  return c || null;
}

/** Fetch rows of a table whose given jsonb column equals a value. */
export async function findRowsByValue(tableId: string, colKey: string, value: string): Promise<DataRow[]> {
  if (!value) return [];
  const { data, error } = await ready()
    .from('data_rows')
    .select('id,table_id,data,position,updated_at')
    .eq('table_id', tableId)
    .eq(`data->>${colKey}`, value)
    .limit(50);
  if (error) throw error;
  return (data || []) as DataRow[];
}

/** Subscribe to live row changes for a table. Returns an unsubscribe fn. */
export function subscribeRows(tableId: string, cb: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const ch = client
    .channel(`data_rows_${tableId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'data_rows', filter: `table_id=eq.${tableId}` }, cb)
    .subscribe();
  return () => { try { client.removeChannel(ch); } catch { /* ignore */ } };
}
