import { User, Document, Message, Notification, KnowledgeArticle, TimelineEvent, Appointment, Employee, TeamTask, ActivityEntry, Deadline } from '../types';

const STORAGE_KEY = 'mas4u_db';

export interface DB {
  users: User[];
  documents: Document[];
  messages: Message[];
  notifications: Notification[];
  knowledgeBase: KnowledgeArticle[];
  timeline: TimelineEvent[];
  appointments: Appointment[];
  employees: Employee[];
  teamTasks: TeamTask[];
  activityLog?: ActivityEntry[];
  deadlines?: Deadline[];
}

const INITIAL_DB: DB = {
  employees: [
    { id: 'emp-1', name: 'אלמוג', role: 'manager' },
    { id: 'emp-2', name: 'נדיה', role: 'employee' },
    { id: 'emp-3', name: 'מיכל', role: 'employee' },
    { id: 'emp-4', name: 'דורית', role: 'employee' },
    { id: 'emp-5', name: 'נימרוד', role: 'employee' },
  ],
  teamTasks: [
    { id: 'task-1', employeeId: 'emp-1', task: 'בדיקת דוחות שנתיים - ישראל ישראלי', priority: 'high', isDone: false, createdAt: new Date().toISOString() },
    { id: 'task-2', employeeId: 'emp-2', task: 'מענה לפנייה דחופה - חברת א.ב.ג', priority: 'medium', isDone: false, createdAt: new Date().toISOString() },
    { id: 'task-3', employeeId: 'emp-3', task: 'סריקת מסמכים שהתקבלו פיזית', priority: 'low', isDone: false, createdAt: new Date().toISOString() },
  ],
  users: [
    {
      id: 'admin-1',
      name: 'מנהל המשרד',
      email: 'admin@mas4u.co.il',
      role: 'admin',
      personalCode: 'admin123',
      status: 'active',
      lastUpdate: new Date().toISOString(),
    },
    {
      id: 'client-1',
      name: 'ישראל ישראלי',
      email: 'israel@example.com',
      role: 'client',
      personalCode: '12345',
      clientNumber: '1001',
      status: 'active',
      lastUpdate: new Date().toISOString(),
      assignedEmployee: 'אלמוג',
      internalNotes: 'לקוח VIP, מעדיף תקשורת בבוקר.',
      taxHealthScore: 92,
      officeLocation: 'סניף תל אביב - מגדלי עזריאלי',
      companyId: '512345678',
      deductionsId: '912345678',
      vatFrequency: 'דו-חודשי',
      incomeTaxFrequency: 'חד-חודשי',
      isCommunityMember: true,
      serviceArea: 'אזור המרכז',
      occupation: 'יועץ אסטרטגי',
      phone: '054-1234567',
      efficiencyTips: [
        'מומלץ לעבור לשימוש בחשבוניות דיגיטליות לחיסכון בזמן',
        'כדאי להפקיד לקרן השתלמות עד סוף הרבעון לניצול הטבת מס',
        'מומלץ לרכז את כל הוצאות הרכב במקום אחד'
      ],
      missingDocuments: [
        { id: 'm1', name: 'חשבונית חשמל פברואר', deadline: '15/04' },
        { id: 'm2', name: 'פירוט כרטיס אשראי עסקי', deadline: '15/04' },
      ],
      annualReportStatus: 'collecting_docs'
    },
    {
      id: 'client-2',
      name: 'שרה כהן',
      email: 'sara@example.com',
      role: 'client',
      personalCode: '54321',
      clientNumber: '1002',
      status: 'active',
      lastUpdate: new Date().toISOString(),
      assignedEmployee: 'נדיה',
      isCommunityMember: true,
      serviceArea: 'אזור השרון',
      occupation: 'מעצבת פנים',
      phone: '052-9876543',
    },
    {
      id: 'client-3',
      name: 'רון לוי',
      email: 'ron@example.com',
      role: 'client',
      personalCode: '11111',
      clientNumber: '1003',
      status: 'active',
      lastUpdate: new Date().toISOString(),
      assignedEmployee: 'מיכל',
      isCommunityMember: true,
      serviceArea: 'אזור הצפון',
      occupation: 'קבלן שיפוצים',
      phone: '053-4445555',
    }
  ],
  documents: [
    { id: 'd1', userId: 'client-1', name: 'דו"ח שנתי 2023', date: '2024-04-12T10:00:00Z', type: 'pdf', size: '1.2 MB', url: '#', status: 'approved', category: 'דוח שנתי', uploadedBy: 'admin' },
    { id: 'd2', userId: 'client-1', name: 'אישור ניכוי מס במקור', date: '2024-04-05T10:00:00Z', type: 'pdf', size: '450 KB', url: '#', status: 'pending', category: 'אישור מס', uploadedBy: 'admin' },
    { id: 'd3', userId: 'client-1', name: 'דו"ח שנתי 2022', date: '2023-05-10T10:00:00Z', type: 'pdf', size: '1.1 MB', url: '#', status: 'approved', category: 'דוח שנתי', uploadedBy: 'admin' },
    { id: 'd4', userId: 'client-1', name: 'דו"ח שנתי 2021', date: '2022-06-15T10:00:00Z', type: 'pdf', size: '1.3 MB', url: '#', status: 'approved', category: 'דוח שנתי', uploadedBy: 'admin' },
    { id: 'd4a', userId: 'client-1', name: 'רווח והפסד - 2023', date: '2024-02-15T10:00:00Z', type: 'excel', size: '150 KB', url: '#', status: 'approved', category: 'רווח והפסד', uploadedBy: 'admin' },
    { id: 'd4b', userId: 'client-1', name: 'רווח והפסד רבעון ראשון 2024', date: '2024-04-20T10:00:00Z', type: 'excel', size: '120 KB', url: '#', status: 'approved', category: 'רווח והפסד', uploadedBy: 'admin' },
    { id: 'd5', userId: 'client-1', name: 'חשבונית דלק - פז מרץ', date: '2024-03-15T10:00:00Z', type: 'image', size: '800 KB', url: '#', status: 'approved', category: 'הוצאה', uploadedBy: 'client' },
    { id: 'd6', userId: 'client-1', name: 'חשבונית רכישת ציוד משרדי', date: '2024-04-14T10:00:00Z', type: 'pdf', size: '1.5 MB', url: '#', status: 'pending', category: 'הוצאה', uploadedBy: 'client' },
    { id: 'd6a', userId: 'client-1', name: 'הכנסות אפריל 2024', date: '2024-04-30T10:00:00Z', type: 'pdf', size: '1.2 MB', url: '#', status: 'approved', category: 'הכנסה', uploadedBy: 'client' },
    { id: 'd6b', userId: 'client-1', name: 'חשבונית עסקית פברואר', date: '2024-02-10T10:00:00Z', type: 'pdf', size: '1.1 MB', url: '#', status: 'approved', category: 'הכנסה', uploadedBy: 'client' },
    { id: 'd7', userId: 'client-1', name: 'סיכום חודשי - מרץ 2024', date: '2024-04-01T10:00:00Z', type: 'pdf', size: '2.1 MB', url: '#', status: 'approved', category: 'אחר', uploadedBy: 'admin' },
    { id: 'd8', userId: 'client-1', name: 'אישור פתיחת תיק במע"מ', date: '2024-01-01T10:00:00Z', type: 'pdf', size: '1.1 MB', url: '#', status: 'approved', category: 'אחר', uploadedBy: 'admin' },
    { id: 'd9', userId: 'client-1', name: 'הודעה על שיעור מקדמות 2024', date: '2024-01-10T10:00:00Z', type: 'pdf', size: '800 KB', url: '#', status: 'approved', category: 'אישור מס', uploadedBy: 'admin' },
    { id: 'd10', userId: 'client-1', name: 'טיוטת דוח שנתי 2023 - לבדיקה', date: '2024-04-13T10:00:00Z', type: 'pdf', size: '2.5 MB', url: '#', status: 'pending', category: 'דוח שנתי', uploadedBy: 'admin', comments: [{ id: 'c1', text: 'ישראל, אנא עבור על הטיוטה ואשר אם הכל תקין.', sender: 'admin', timestamp: new Date().toISOString() }] },
    { id: 'd11', userId: 'client-1', name: 'אישור ניכוי מס במקור 2024', date: '2024-01-15T10:00:00Z', type: 'pdf', size: '400 KB', url: '#', status: 'approved', category: 'אישור מס', uploadedBy: 'admin' },
    { id: 'd12', userId: 'client-2', name: 'חשבונית הוצאות שוטפות', date: '2024-05-01T10:00:00Z', type: 'pdf', size: '1.2 MB', url: '#', status: 'approved', category: 'הוצאה', uploadedBy: 'client' },
    { id: 'd13', userId: 'client-2', name: 'סיכום חודש אפריל', date: '2024-05-02T10:00:00Z', type: 'pdf', size: '800 KB', url: '#', status: 'pending', category: 'אחר', uploadedBy: 'admin' },
    { id: 'd14', userId: 'client-3', name: 'אישור מס', date: '2024-05-10T10:00:00Z', type: 'pdf', size: '500 KB', url: '#', status: 'approved', category: 'אישור מס', uploadedBy: 'admin' },
  ],
  messages: [
    { id: 'm1', userId: 'client-1', senderId: 'admin-1', text: 'שלום ישראל, קיבלנו את המסמכים שלך.', timestamp: new Date().toISOString(), isRead: false }
  ],
  notifications: [
    { id: 'n1', userId: 'client-1', title: 'מסמך אושר', message: 'הדו"ח השנתי שלך לשנת 2023 אושר על ידי אלמוג.', timestamp: new Date().toISOString(), isRead: false, type: 'success' },
    { id: 'n2', userId: 'client-1', title: 'תזכורת הגשה', message: 'אל תשכח להעלות את אישורי המעסיק עד סוף החודש.', timestamp: new Date().toISOString(), isRead: false, type: 'warning' },
    { id: 'n3', userId: 'client-1', title: 'הודעה חדשה מהמשרד', message: 'היי ישראל, שלחנו לך את טיוטת הדוח השנתי לבדיקה.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), isRead: false, type: 'info' },
  ],
  knowledgeBase: [
    { id: 'k1', title: 'איך לקבל החזר מס מקסימלי?', excerpt: 'מדריך קצר על הנקודות שחשוב לבדוק לפני הגשת הדוח.', content: 'תוכן המדריך המלא...', category: 'מדריכים', readTime: '5 דק׳', icon: 'Lightbulb' },
    { id: 'k2', title: 'זכויות עובדים ב-2024', excerpt: 'כל מה שחדש בחוקי המס והזכויות הסוציאליות השנה.', content: 'תוכן המדריך המלא...', category: 'זכויות', readTime: '8 דק׳', icon: 'ShieldCheck' },
    { id: 'k3', title: 'מיסוי קריפטו בישראל', excerpt: 'כל מה שצריך לדעת על דיווח רווחים ממטבעות דיגיטליים.', content: 'תוכן המדריך המלא...', category: 'מיסים', readTime: '6 דק׳', icon: 'Coins' },
    { id: 'k4', title: 'הוצאות מוכרות לעצמאיים', excerpt: 'רשימה מעודכנת של כל ההוצאות שניתן לקזז מהכנסות העסק.', content: 'תוכן המדריך המלא...', category: 'מדריכים', readTime: '10 דק׳', icon: 'FileText' }
  ],
  timeline: [
    { id: 't1', userId: 'client-1', title: 'מסמך הועלה', description: 'העלית את אישור ניכוי מס במקור', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'upload' },
    { id: 't2', userId: 'client-1', title: 'בדיקה ראשונית', description: 'אלמוג התחיל/ה לעבור על המסמכים שלך', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), type: 'review' },
    { id: 't3', userId: 'client-1', title: 'אישור סופי', description: 'הדו"ח השנתי 2023 אושר בהצלחה', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), type: 'approval' },
    { id: 't4', userId: 'client-1', title: 'העלאת מסמך ע"י המשרד', description: 'אלמוג העלה עבורך את טיוטת הדוח השנתי', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), type: 'upload' },
  ],
  appointments: [
    { id: 'a1', userId: 'client-1', date: '2024-04-20', time: '10:00', type: 'zoom', status: 'scheduled' }
  ]
};

// ---------------------------------------------------------------------------
// Shared, real-time database layer.
//
// The whole DB lives as a single JSON row in Supabase so every user in the
// office shares one source of truth. To avoid rewriting every component, the
// public getDB()/saveDB() API stays SYNCHRONOUS and works against an in-memory
// cache. On startup initDB() hydrates that cache from Supabase (seeding it on
// first run), and a realtime subscription keeps it fresh when someone else
// makes a change. If Supabase is not configured, everything falls back to
// browser localStorage exactly as before.
// ---------------------------------------------------------------------------

import { supabase, APP_STATE_TABLE, APP_STATE_ID } from './supabaseClient';

const DB_CHANGED_EVENT = 'mas4u-db-changed';

// Fill in any missing top-level arrays so old/partial data never crashes filters.
const normalize = (parsed: Partial<DB> | null | undefined): DB => ({
  ...INITIAL_DB,
  ...(parsed || {}),
  users: parsed?.users || INITIAL_DB.users,
  documents: parsed?.documents || INITIAL_DB.documents,
  messages: parsed?.messages || INITIAL_DB.messages,
  notifications: parsed?.notifications || INITIAL_DB.notifications,
  knowledgeBase: parsed?.knowledgeBase || INITIAL_DB.knowledgeBase,
  timeline: parsed?.timeline || INITIAL_DB.timeline,
  appointments: parsed?.appointments || INITIAL_DB.appointments,
  employees: parsed?.employees || INITIAL_DB.employees,
  teamTasks: parsed?.teamTasks || INITIAL_DB.teamTasks,
  activityLog: parsed?.activityLog || [],
  deadlines: parsed?.deadlines || [],
});

const readLocal = (): DB => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return normalize(INITIAL_DB);
    return normalize(JSON.parse(data));
  } catch (error) {
    console.error('Corrupted local database detected, resetting to defaults:', error);
    return normalize(INITIAL_DB);
  }
};

// Default login details for the pre-seeded staff members. Every employee needs
// a login account (role 'admin') so they can sign in on the office side.
const STAFF_LOGIN_SEED: Record<string, { email: string; code: string }> = {
  'אלמוג': { email: 'almog@mas4u.co.il', code: '4001' },
  'נדיה': { email: 'nadia@mas4u.co.il', code: '4002' },
  'מיכל': { email: 'michal@mas4u.co.il', code: '4003' },
  'דורית': { email: 'dorit@mas4u.co.il', code: '4004' },
  'נימרוד': { email: 'nimrod@mas4u.co.il', code: '4005' },
};

/**
 * Make sure every staff member (employees list) has a matching login account
 * so they can sign in on the office/admin side. Self-heals existing data.
 * Returns true if anything was added/changed (so the caller can persist).
 */
const ensureStaffAccounts = (db: DB): boolean => {
  let changed = false;
  (db.employees || []).forEach((emp, idx) => {
    if (!emp.email) {
      emp.email = STAFF_LOGIN_SEED[emp.name]?.email || `staff${idx + 1}@mas4u.co.il`;
      changed = true;
    }
    if (!emp.code) {
      emp.code = STAFF_LOGIN_SEED[emp.name]?.code || String(4001 + idx);
      changed = true;
    }
    const existing = db.users.find(
      (u) => u.email && u.email.toLowerCase() === emp.email!.toLowerCase()
    );
    if (existing) {
      if (existing.role !== 'admin') { existing.role = 'admin'; changed = true; }
      if (existing.personalCode !== emp.code) { existing.personalCode = emp.code; changed = true; }
    } else {
      db.users.push({
        id: `staff-${emp.id}`,
        name: emp.name,
        email: emp.email!,
        role: 'admin',
        personalCode: emp.code,
        status: 'active',
        lastUpdate: new Date().toISOString(),
      } as User);
      changed = true;
    }
  });
  return changed;
};

// In-memory cache — the synchronous source of truth for the running app.
let _cache: DB = readLocal();
ensureStaffAccounts(_cache);

export const getDB = (): DB => _cache;

export const saveDB = (db: DB) => {
  _cache = normalize(db);
  const json = JSON.stringify(_cache);
  try { localStorage.setItem(STORAGE_KEY, json); } catch { /* ignore quota errors */ }

  if (supabase) {
    // Fire-and-forget push of the full shared state. Last write wins.
    supabase
      .from(APP_STATE_TABLE)
      .upsert({ id: APP_STATE_ID, data: _cache, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error('Supabase saveDB failed:', error.message);
      });
  }
};

let _realtimeStarted = false;
const startRealtime = () => {
  if (!supabase || _realtimeStarted) return;
  _realtimeStarted = true;
  supabase
    .channel('app_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: APP_STATE_TABLE, filter: `id=eq.${APP_STATE_ID}` },
      (payload: any) => {
        const incoming = payload?.new?.data;
        if (!incoming) return;
        const incomingJson = JSON.stringify(incoming);
        // Ignore the echo of our own write.
        if (incomingJson === JSON.stringify(_cache)) return;
        _cache = normalize(incoming);
        try { localStorage.setItem(STORAGE_KEY, incomingJson); } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent(DB_CHANGED_EVENT));
      }
    )
    .subscribe();
};

/**
 * Hydrate the shared database from Supabase (seeding it on first run) and start
 * listening for live changes. Safe to call once at app startup. Resolves even
 * on failure, having fallen back to localStorage.
 */
export const initDB = async (): Promise<void> => {
  if (!supabase) {
    _cache = readLocal();
    ensureStaffAccounts(_cache);
    return;
  }
  try {
    const { data, error } = await supabase
      .from(APP_STATE_TABLE)
      .select('data')
      .eq('id', APP_STATE_ID)
      .maybeSingle();
    if (error) throw error;

    if (data && data.data) {
      _cache = normalize(data.data);
      // Self-heal: make sure staff login accounts exist, then persist if changed.
      const migrated = ensureStaffAccounts(_cache);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); } catch { /* ignore */ }
      if (migrated) {
        await supabase
          .from(APP_STATE_TABLE)
          .upsert({ id: APP_STATE_ID, data: _cache, updated_at: new Date().toISOString() });
      }
    } else {
      // First run: seed the shared row from whatever we have locally (or defaults).
      _cache = readLocal();
      ensureStaffAccounts(_cache);
      const { error: seedError } = await supabase
        .from(APP_STATE_TABLE)
        .upsert({ id: APP_STATE_ID, data: _cache, updated_at: new Date().toISOString() });
      if (seedError) throw seedError;
    }
    startRealtime();
  } catch (e: any) {
    console.error('Supabase init failed, using local storage only:', e?.message || e);
    _cache = readLocal();
    ensureStaffAccounts(_cache);
  }
};

/** Subscribe to live changes made by other users. Returns an unsubscribe fn. */
export const onDBChange = (callback: () => void): (() => void) => {
  window.addEventListener(DB_CHANGED_EVENT, callback);
  return () => window.removeEventListener(DB_CHANGED_EVENT, callback);
};

// ---------------------------------------------------------------------------
// Activity log — records who did what, when (office oversight / audit).
// ---------------------------------------------------------------------------
let _currentActor = 'משתמש';
export const setCurrentActor = (name?: string) => {
  if (name) _currentActor = name;
};

export const logActivity = (action: string, detail?: string) => {
  const entry: ActivityEntry = {
    id: `act-${Date.now()}-${_cache.activityLog?.length || 0}`,
    at: new Date().toISOString(),
    actor: _currentActor,
    action,
    detail,
  };
  const log = [...(_cache.activityLog || []), entry].slice(-500); // keep last 500
  saveDB({ ..._cache, activityLog: log });
};

export const addUser = (user: User) => {
  const db = getDB();
  db.users.push(user);
  saveDB(db);
};

export const addDocument = (doc: Document) => {
  const db = getDB();
  db.documents.push(doc);
  saveDB(db);
};

export const addMessage = (msg: Message) => {
  const db = getDB();
  db.messages.push(msg);
  saveDB(db);
};
