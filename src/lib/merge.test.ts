import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeThreeWay, mergeArrays, pushMerged, RemoteStore } from './merge.ts';

type S = { teamTasks: any[]; messages: any[]; title?: string };
const t = (id: string, extra: any = {}) => ({ id, task: 'task ' + id, ...extra });

test('two people add different items: nobody loses anything', () => {
  const base: S = { teamTasks: [t('1')], messages: [] };
  const mine: S = { ...base, teamTasks: [t('1'), t('mine')] };
  const theirs: S = { ...base, teamTasks: [t('1'), t('theirs')] };
  const merged = mergeThreeWay(base, mine, theirs);
  assert.deepEqual(merged.teamTasks.map((x) => x.id).sort(), ['1', 'mine', 'theirs']);
});

test('two people edit different fields of different items', () => {
  const base: S = { teamTasks: [t('1'), t('2')], messages: [] };
  const mine = { ...base, teamTasks: [t('1', { isDone: true }), t('2')] };
  const theirs = { ...base, teamTasks: [t('1'), t('2', { priority: 'high' })] };
  const merged = mergeThreeWay(base, mine, theirs);
  assert.equal(merged.teamTasks.find((x) => x.id === '1').isDone, true);
  assert.equal(merged.teamTasks.find((x) => x.id === '2').priority, 'high');
});

test('same item edited by both: my edit wins', () => {
  const base: S = { teamTasks: [t('1')], messages: [] };
  const mine = { ...base, teamTasks: [t('1', { task: 'mine' })] };
  const theirs = { ...base, teamTasks: [t('1', { task: 'theirs' })] };
  assert.equal(mergeThreeWay(base, mine, theirs).teamTasks[0].task, 'mine');
});

test('I delete an item: it stays deleted and their additions survive', () => {
  const base: S = { teamTasks: [t('1'), t('2')], messages: [] };
  const mine = { ...base, teamTasks: [t('2')] };
  const theirs = { ...base, teamTasks: [t('1'), t('2'), t('new')] };
  assert.deepEqual(mergeThreeWay(base, mine, theirs).teamTasks.map((x) => x.id), ['2', 'new']);
});

test('they delete an item I did not touch: it stays deleted', () => {
  const base: S = { teamTasks: [t('1'), t('2')], messages: [] };
  const mine = { ...base, messages: [{ id: 'm1' }] };
  const theirs = { ...base, teamTasks: [t('2')] };
  const merged = mergeThreeWay(base, mine, theirs);
  assert.deepEqual(merged.teamTasks.map((x) => x.id), ['2']);
  assert.deepEqual(merged.messages.map((x) => x.id), ['m1']);
});

test('they delete an item I edited: my edit is kept, not lost', () => {
  const base: S = { teamTasks: [t('1')], messages: [] };
  const mine = { ...base, teamTasks: [t('1', { task: 'edited' })] };
  const theirs = { ...base, teamTasks: [] };
  assert.equal(mergeThreeWay(base, mine, theirs).teamTasks[0].task, 'edited');
});

test('new item added at the front stays at the front', () => {
  const merged = mergeArrays([t('a')], [t('new'), t('a')], [t('a'), t('b')]);
  assert.deepEqual(merged.map((x) => x.id), ['new', 'a', 'b']);
});

test('plain fields: my change wins, otherwise theirs', () => {
  const base: S = { teamTasks: [], messages: [], title: 'old' };
  assert.equal(mergeThreeWay(base, { ...base, title: 'mine' }, { ...base, title: 'theirs' }).title, 'mine');
  assert.equal(mergeThreeWay(base, base, { ...base, title: 'theirs' }).title, 'theirs');
});

test('no remote row yet: local state is used as is', () => {
  const local: S = { teamTasks: [t('1')], messages: [] };
  assert.equal(mergeThreeWay(null, local, null), local);
});

// A tiny in-memory stand-in for the database, with the same optimistic-lock rule.
const fakeStore = (initial: S) => {
  let data = initial;
  let v = 1;
  const store: RemoteStore<S> = {
    async read() { return { data: structuredClone(data), version: String(v) }; },
    async writeIf(next, expected) {
      if (String(v) !== expected) return false;
      data = structuredClone(next); v++; return true;
    },
  };
  return { store, get: () => data };
};

test('concurrent save: a write that lands between read and write is retried and merged', async () => {
  const base: S = { teamTasks: [t('1')], messages: [] };
  const db = fakeStore(base);
  // simulate the other employee by writing through a second client right before our write
  const other = { ...base, teamTasks: [t('1'), t('theirs')] };
  let first = true;
  const racing: RemoteStore<S> = {
    read: db.store.read,
    async writeIf(next, expected) {
      if (first) { first = false; await db.store.writeIf(other, expected); }
      return db.store.writeIf(next, expected);
    },
  };
  const mine = { ...base, teamTasks: [t('1'), t('mine')] };
  await pushMerged(racing, base, mine);
  assert.deepEqual(db.get().teamTasks.map((x) => x.id).sort(), ['1', 'mine', 'theirs']);
});

test('gives up with a clear error if the data keeps changing', async () => {
  const always: RemoteStore<S> = {
    async read() { return { data: { teamTasks: [], messages: [] }, version: String(Math.random()) }; },
    async writeIf() { return false; },
  };
  await assert.rejects(() => pushMerged(always, null, { teamTasks: [], messages: [] }, 3), /kept changing/);
});
