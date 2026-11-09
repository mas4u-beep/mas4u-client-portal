import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TeamTasks } from '../components/TeamTasks.tsx';

const mk = (over: any = {}) => ({
  users: [{ id: 'u1', name: 'דנה כהן', email: 'd@x.co' }, { id: 'u2', name: 'בוס בוס', email: 'b@x.co' }],
  notifications: [],
  employees: [{ id: 'e1', name: 'דנה כהן', email: 'd@x.co' }],
  teamTasks: [
    { id: 'a', employeeId: 'e1', task: 'ראשונה', priority: 'low', isDone: false, status: 'open', order: 1, assignedByName: 'בוס בוס', createdAt: '2026-01-01' },
    { id: 'b', employeeId: 'e1', task: 'שנייה', priority: 'high', isDone: false, status: 'open', order: 0, assignedByName: 'בוס בוס', createdAt: '2026-01-02',
      questions: [{ id: 'q1', from: 'דנה כהן', text: 'איזו שנה?', at: '2026-01-03' }] },
  ],
  ...over,
});
const html = (db: any, user: any) =>
  renderToString(<TeamTasks db={db} setDb={() => {}} saveDB={() => {}} currentUser={user} />).replace(/<!-- -->/g, '');

test('manual order wins over priority', () => {
  const h = html(mk(), { id: 'u1', name: 'דנה כהן', email: 'd@x.co' });
  assert.ok(h.indexOf('שנייה') < h.indexOf('ראשונה'));
});

test('employee sees ask button and pending question; boss sees an answer box', () => {
  const emp = html(mk(), { id: 'u1', name: 'דנה כהן', email: 'd@x.co' });
  assert.match(emp, /איזו שנה\?/);
  assert.match(emp, /ממתין לתשובה/);
  const boss = html(mk(), { id: 'u2', name: 'בוס בוס', email: 'b@x.co' });
  assert.match(boss, /aria-label="תשובה לשאלה"/);
});
