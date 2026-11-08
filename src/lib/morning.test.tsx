import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MorningAssign } from '../components/MorningAssign.tsx';

test('MorningAssign renders employees with their open-task counts', () => {
  const db: any = {
    users: [], notifications: [],
    employees: [{ id: 'e1', name: 'דנה', email: 'd@x.co' }, { id: 'e2', name: 'יוסי', email: 'y@x.co' }],
    teamTasks: [
      { id: 't1', employeeId: 'e1', task: 'דוח מע"מ', priority: 'high', isDone: false },
      { id: 't2', employeeId: 'e1', task: 'ישנה', priority: 'low', isDone: true },
    ],
  };
  const html = renderToString(<MorningAssign db={db} setDb={() => {}} saveDB={() => {}} myName="מנהל" />).replace(/<!-- -->/g, "");
  assert.match(html, /הקצאת בוקר/);
  assert.match(html, /דנה/);
  assert.match(html, /1 פתוחות/);
  assert.match(html, /0 פתוחות/);
});
