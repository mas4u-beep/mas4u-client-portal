import { User, Document, Message, Notification, KnowledgeArticle, TimelineEvent, Appointment, Employee, TeamTask } from '../types';

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

export const getDB = (): DB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
    return INITIAL_DB;
  }

  let parsed: Partial<DB>;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    console.error('Corrupted local database detected, resetting to defaults:', error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
    return INITIAL_DB;
  }

  // Ensure all arrays exist to prevent "filter of undefined" errors on old data
  return {
    ...INITIAL_DB,
    ...parsed,
    users: parsed.users || INITIAL_DB.users,
    documents: parsed.documents || INITIAL_DB.documents,
    messages: parsed.messages || INITIAL_DB.messages,
    notifications: parsed.notifications || INITIAL_DB.notifications,
    knowledgeBase: parsed.knowledgeBase || INITIAL_DB.knowledgeBase,
    timeline: parsed.timeline || INITIAL_DB.timeline,
    appointments: parsed.appointments || INITIAL_DB.appointments,
    employees: parsed.employees || INITIAL_DB.employees,
    teamTasks: parsed.teamTasks || INITIAL_DB.teamTasks,
  };
};
export const saveDB = (db: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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
