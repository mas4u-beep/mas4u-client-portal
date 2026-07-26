export type UserRole = 'client' | 'admin';
export type EmployeeName = 'אלמוג' | 'נדיה' | 'מיכל' | 'דורית' | 'נימרוד';

export interface TimelineEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'upload' | 'review' | 'approval' | 'rejection' | 'message';
}

export interface Appointment {
  id: string;
  userId: string;
  date: string;
  time: string;
  type: 'frontal' | 'zoom';
  status: 'scheduled' | 'completed' | 'cancelled';
}

export type DocStatus = 'יש' | 'חסר' | 'בתהליך' | 'אין';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  idNumber?: string;
  occupation?: string;
  dealerType?: 'מורשה' | 'פטור';
  email: string;
  role: UserRole;
  personalCode?: string;
  clientNumber?: string; // מספר לקוח
  assignmentCode?: string; // שיוכים - קוד זיהוי קבוע
  avatar?: string;
  status: 'active' | 'pending' | 'completed';
  lastUpdate: string;
  assignedEmployee?: EmployeeName;
  internalNotes?: string;
  taxHealthScore?: number;
  // Detailed Profile Fields
  officeLocation?: string;
  companyId?: string; // ח.פ
  deductionsId?: string; // תיק ניכויים
  vatFrequency?: 'חד-חודשי' | 'דו-חודשי';
  incomeTaxFrequency?: 'חד-חודשי' | 'דו-חודשי';
  efficiencyTips?: string[];
  missingDocuments?: { id: string; name: string; deadline: string }[];
  annualReportStatus?: 'not_started' | 'collecting_docs' | 'in_preparation' | 'submitted' | 'completed';
  annualReportDocs?: {
    form106: DocStatus;
    form106Spouse: DocStatus;
    studyFund: DocStatus;
    form867: DocStatus;
    allowances: DocStatus;
  };
  // Community fields
  isCommunityMember?: boolean;
  serviceArea?: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  date: string;
  type: 'pdf' | 'excel' | 'doc' | 'image';
  size: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected' | 'duplicate' | 'unrecognized';
  category?: 'כפילות' | 'דוח שנתי' | 'אישור מס' | 'אחר' | 'הוצאה' | 'הכנסה' | 'שכר' | 'רווח והפסד';
  purpose?: 'לבדיקת המשרד' | 'מסמכים שוטפים' | 'מסמכים לדוח השנתי';
  uploadedBy?: 'admin' | 'client';
  signature?: string; // Base64 signature image
  comments?: { id: string; text: string; sender: 'admin' | 'client'; timestamp: string }[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'מיסים' | 'זכויות' | 'מדריכים';
  readTime: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Message {
  id: string;
  userId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Report {
  id: string;
  name: string;
  date: string;
  type: 'pdf' | 'excel' | 'doc';
  size: string;
  url: string;
}

export interface StatusStep {
  id: number;
  label: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: 'manager' | 'employee';
  avatar?: string;
}

export interface TeamTask {
  id: string;
  employeeId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  isDone: boolean;
  createdAt: string;
}

export interface DB {
  users: User[];
  documents: Document[];
  notifications: Notification[];
  knowledgeBase: KnowledgeArticle[];
  timeline: TimelineEvent[];
  appointments: Appointment[];
  messages: Message[];
  employees: Employee[];
  teamTasks: TeamTask[];
}
