// Three-way merge for the shared app state.
//
// The whole office database is one JSON document. Before this module, every save
// overwrote the entire document ("last write wins"), so two people editing
// different things at the same moment could silently erase each other's work.
//
// Instead we merge by item id using three versions:
//   base   - the shared state as we last saw it (before our edit)
//   local  - what this user has now (their edits applied)
//   remote - what is stored right now (may include other people's edits)

type Json = any;
type Item = { id: string } & Record<string, Json>;

// JSON.stringify with sorted keys, so equal objects compare equal regardless of key order.
export const stable = (v: Json): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
};

export const same = (a: Json, b: Json): boolean => stable(a) === stable(b);

const byId = (arr: Item[] | undefined): Map<string, Item> => {
  const m = new Map<string, Item>();
  (arr || []).forEach((x) => { if (x && x.id !== undefined) m.set(String(x.id), x); });
  return m;
};

const isIdArray = (x: Json): boolean =>
  x === undefined || (Array.isArray(x) && x.every((i: Json) => i && typeof i === 'object' && 'id' in i));

export function mergeArrays(base: Item[] | undefined, local: Item[] | undefined, remote: Item[] | undefined): Item[] {
  const b = byId(base);
  const l = byId(local);
  const r = byId(remote);
  const out: Item[] = [];

  // Start from the remote order, then apply what this user changed.
  (remote || []).forEach((rItem) => {
    const id = String(rItem.id);
    const inBase = b.has(id);
    const inLocal = l.has(id);
    if (inBase && !inLocal) return; // this user deleted it
    if (inLocal) {
      const lItem = l.get(id)!;
      const changedLocally = !inBase || !same(lItem, b.get(id));
      out.push(changedLocally ? lItem : rItem); // our edit wins; otherwise keep theirs
    } else {
      out.push(rItem); // added by someone else
    }
  });

  // Items that exist only on our side.
  const before: Item[] = [];
  const after: Item[] = [];
  let seenCommon = false;
  (local || []).forEach((lItem) => {
    const id = String(lItem.id);
    if (r.has(id)) { seenCommon = true; return; }
    const inBase = b.has(id);
    if (inBase && same(lItem, b.get(id))) return; // someone else deleted it and we did not touch it
    (seenCommon ? after : before).push(lItem);    // new from us, or edited by us after a remote delete
  });

  return [...before, ...out, ...after];
}

export function mergeThreeWay<T extends Record<string, Json>>(base: T | null | undefined, local: T, remote: T | null | undefined): T {
  if (!remote) return local;
  const baseObj: Record<string, Json> = base || {};
  const keys = new Set([...Object.keys(baseObj), ...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, Json> = {};
  keys.forEach((k) => {
    const lv = (local as any)[k];
    const rv = (remote as any)[k];
    const bv = baseObj[k];
    const values = [lv, rv, bv];
    if (values.some(Array.isArray) && values.every(isIdArray)) {
      out[k] = mergeArrays(bv, lv, rv); // lists of items with ids are merged item by item
      return;
    }
    // Anything else: our change wins, otherwise take the current remote value.
    out[k] = same(lv, bv) ? rv : lv;
  });
  return out as T;
}

// ---------------------------------------------------------------------------
// Push with optimistic locking: write only if nobody changed the row since we
// read it, otherwise read again, merge again and retry.
// ---------------------------------------------------------------------------

export interface RemoteStore<T> {
  read(): Promise<{ data: T; version: string } | null>;
  /** Writes `data` only if the stored version still equals `expectedVersion` (null = row must not exist yet). */
  writeIf(data: T, expectedVersion: string | null): Promise<boolean>;
}

export async function pushMerged<T extends Record<string, Json>>(
  store: RemoteStore<T>,
  base: T | null,
  local: T,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remote = await store.read();
    const merged = remote ? mergeThreeWay(base ?? remote.data, local, remote.data) : local;
    if (await store.writeIf(merged, remote ? remote.version : null)) return merged;
  }
  throw new Error('Could not save: the shared data kept changing. Please try again.');
}
