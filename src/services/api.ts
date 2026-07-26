import { DB, User, Document, Notification, TimelineEvent, Appointment, KnowledgeArticle } from '../types';
import { getDB, saveDB } from '../lib/mockData';

/**
 * Service layer to handle all data operations.
 * This abstraction allows for easy switching between mock data and a real API in the future.
 */
class ApiService {
  private db: DB;

  constructor() {
    this.db = getDB();
  }

  private refresh() {
    this.db = getDB();
  }

  // Auth Operations
  async login(email: string, code: string): Promise<User | null> {
    this.refresh();
    console.log('Attempting login for:', email);
    
    // Hardcode admin fallback if local storage is stale
    if (email.toLowerCase() === 'admin@mas4u.co.il' && code === 'admin123') {
       const adminUser = this.db.users.find(u => u.email.toLowerCase() === 'admin@mas4u.co.il');
       if (adminUser) {
           adminUser.personalCode = 'admin123';
           saveDB(this.db);
           console.log('Login successful (Admin Fallback):', adminUser.name);
           return adminUser;
       }
    }

    const user = this.db.users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      (u.personalCode === code || u.id === code) // Allow login with ID as fallback for new users
    );
    if (user) {
      console.log('Login successful:', user.name);
    } else {
      console.warn('Login failed for:', email);
    }
    return user || null;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    this.refresh();
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'client',
      status: 'active',
      lastUpdate: new Date().toISOString(),
      taxHealthScore: 0,
      ...userData,
      personalCode: userData.personalCode || Math.floor(10000 + Math.random() * 90000).toString(),
    } as User;

    this.db.users.push(newUser);
    saveDB(this.db);
    return newUser;
  }

  async updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User> {
    this.refresh();
    const user = this.db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('משתמש לא נמצא');
    }
    if (updates.name && updates.name.trim()) user.name = updates.name.trim();
    if (updates.email && updates.email.trim()) user.email = updates.email.trim();
    user.lastUpdate = new Date().toISOString();
    saveDB(this.db);
    return user;
  }

  // Document Operations
  async getDocuments(userId: string): Promise<Document[]> {
    this.refresh();
    return this.db.documents.filter(d => d.userId === userId);
  }

  async uploadDocument(userId: string, file: File, purpose?: Document['purpose'], onProgress?: (progress: number) => void, uploadedBy: 'client' | 'admin' = 'client'): Promise<Document> {
    // Simulate upload progress
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (onProgress) onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          this.refresh();
          
          // Mock AI Classification
          let category: Document['category'] = 'אחר';
          const name = file.name.toLowerCase();
          if (name.includes('חשבונית') || name.includes('invoice')) category = 'הוצאה';
          if (name.includes('קבלה') || name.includes('receipt')) category = 'הוצאה';
          if (name.includes('משכורת') || name.includes('payslip')) category = 'שכר';
          if (name.includes('בנק') || name.includes('bank')) category = 'אחר';

          const newDoc: Document = {
            id: `doc-${Date.now()}`,
            userId,
            name: file.name,
            type: file.type.includes('pdf') ? 'pdf' : 'image',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            date: new Date().toLocaleDateString('he-IL'),
            status: 'pending',
            url: '#',
            category,
            purpose,
            uploadedBy,
            comments: []
          };
          this.db.documents.push(newDoc);
          
          // Add to timeline
          this.db.timeline.push({
            id: `t-${Date.now()}`,
            userId,
            title: 'העלאת מסמך',
            description: `העלית את המסמך: ${file.name} (מטרה: ${purpose || 'כללי'})`,
            timestamp: new Date().toISOString(),
            type: 'upload'
          });

          // Add notification to admin
          this.db.notifications.push({
            id: `n-${Date.now()}`,
            userId: 'admin',
            title: 'מסמך חדש הועלה',
            message: `הלקוח העלה מסמך חדש: ${file.name} (${purpose || 'כללי'})`,
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'info'
          });

          saveDB(this.db);
          resolve(newDoc);
        }
      }, 150);
    });
  }

  async addDocumentComment(docId: string, text: string, sender: 'admin' | 'client'): Promise<void> {
    this.refresh();
    const doc = this.db.documents.find(d => d.id === docId);
    if (doc) {
      if (!doc.comments) doc.comments = [];
      doc.comments.push({
        id: `c-${Date.now()}`,
        text,
        sender,
        timestamp: new Date().toISOString()
      });
      saveDB(this.db);
    }
  }

  async sendAutomatedReminders(): Promise<number> {
    this.refresh();
    let count = 0;
    this.db.users.forEach(user => {
      if (user.role === 'client' && user.missingDocuments && user.missingDocuments.length > 0) {
        this.db.notifications.push({
          id: `n-${Date.now()}-${user.id}`,
          userId: user.id,
          title: 'תזכורת אוטומטית: מסמכים חסרים',
          message: `שלום ${user.name}, שים לב שחסרים לך ${user.missingDocuments.length} מסמכים לדיווח הקרוב. אנא העלה אותם בהקדם.`,
          timestamp: new Date().toISOString(),
          isRead: false,
          type: 'warning'
        });
        count++;
      }
    });
    saveDB(this.db);
    return count;
  }

  async updateAnnualReportStatus(userId: string, status: User['annualReportStatus']): Promise<void> {
    this.refresh();
    const user = this.db.users.find(u => u.id === userId);
    if (user) {
      user.annualReportStatus = status;
      saveDB(this.db);
    }
  }

  async updateUserAssignmentCode(userId: string, code: string): Promise<void> {
    this.refresh();
    const user = this.db.users.find(u => u.id === userId);
    if (user) {
      user.assignmentCode = code;
      saveDB(this.db);
    }
  }

  async updateAnnualReportDocs(userId: string, docs: User['annualReportDocs']): Promise<void> {
    this.refresh();
    const user = this.db.users.find(u => u.id === userId);
    if (user) {
      user.annualReportDocs = { ...user.annualReportDocs, ...docs } as any;
      saveDB(this.db);
    }
  }

  // Timeline & Notifications
  async getTimeline(userId: string): Promise<TimelineEvent[]> {
    this.refresh();
    return this.db.timeline.filter(t => t.userId === userId);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    this.refresh();
    return this.db.notifications.filter(n => n.userId === userId);
  }

  // Knowledge Base
  async getKnowledgeBase(): Promise<KnowledgeArticle[]> {
    this.refresh();
    return this.db.knowledgeBase;
  }

  // Community
  async getCommunityMembers(): Promise<User[]> {
    this.refresh();
    return this.db.users.filter(u => u.isCommunityMember && u.status === 'active' && u.role === 'client');
  }

  // Appointments
  async scheduleAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    this.refresh();
    const newAppointment: Appointment = {
      id: `app-${Date.now()}`,
      userId: appointment.userId || '',
      date: appointment.date || '',
      time: appointment.time || '',
      type: appointment.type || 'zoom',
      status: 'scheduled'
    };
    this.db.appointments.push(newAppointment);
    saveDB(this.db);
    return newAppointment;
  }
}

export const api = new ApiService();
