import * as XLSX from 'xlsx';
import { TableColumn } from './dataTables';

export interface ParsedSheet {
  sheetName: string;
  matrix: any[][]; // raw rows as arrays of cell values
}

/** Read an .xlsx File into per-sheet 2D matrices (in the browser, no server). */
export async function parseWorkbook(file: File): Promise<ParsedSheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets: ParsedSheet[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    // header:1 -> array of arrays; defval:'' keeps empty cells aligned
    const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false, blankrows: false });
    sheets.push({ sheetName: name, matrix });
  }
  return sheets;
}

const cleanCell = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());

/** Build column definitions from a header row, giving blank/duplicate headers unique keys. */
export function buildColumns(headerRow: any[]): TableColumn[] {
  const seen: Record<string, number> = {};
  const cols: TableColumn[] = [];
  // Trim trailing empty header cells.
  let last = -1;
  headerRow.forEach((c, i) => { if (cleanCell(c) !== '') last = i; });
  for (let i = 0; i <= last; i++) {
    let label = cleanCell(headerRow[i]);
    if (label === '') label = `עמודה ${i + 1}`;
    let base = label;
    if (seen[base] !== undefined) { seen[base] += 1; label = `${base} (${seen[base]})`; }
    else seen[base] = 1;
    cols.push({ key: `c${i}`, label });
  }
  return cols;
}

/** Build data rows (array of { colKey: value }) from a matrix given header + data start indices. */
export function buildRows(matrix: any[][], columns: TableColumn[], dataStartIdx: number): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (let r = dataStartIdx; r < matrix.length; r++) {
    const raw = matrix[r] || [];
    const obj: Record<string, any> = {};
    let hasAny = false;
    columns.forEach((col, i) => {
      const v = cleanCell(raw[i]);
      obj[col.key] = v;
      if (v !== '') hasAny = true;
    });
    if (hasAny) rows.push(obj);
  }
  return rows;
}
