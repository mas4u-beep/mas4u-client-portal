import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, Phone, Users, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/src/services/api';
import { User } from '@/src/types';
import { toast } from 'sonner';

export function Community() {
  const [members, setMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newMember, setNewMember] = useState({
    name: '',
    occupation: '',
    serviceArea: '',
    phone: '',
    description: ''
  });

  useEffect(() => {
    const fetchMembers = async () => {
      const data = await api.getCommunityMembers();
      setMembers(data);
    };
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.occupation || !newMember.phone) {
      toast.error('נא למלא את כל שדות החובה (שם, תחום וטלפון)');
      return;
    }

    try {
      const createdMember = await api.createUser({
        name: newMember.name,
        email: '',
        role: 'client',
        occupation: newMember.occupation,
        serviceArea: newMember.serviceArea,
        phone: newMember.phone,
        isCommunityMember: true,
      });

      setMembers([createdMember, ...members]);
      setShowAddForm(false);
      setNewMember({ name: '', occupation: '', serviceArea: '', phone: '', description: '' });
      toast.success('המודעה נוספה בהצלחה לקהילה!');
    } catch (error) {
      console.error('Failed to add community member:', error);
      toast.error('אירעה שגיאה בפרסום המודעה. אנא נסה שוב.');
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.occupation?.toLowerCase().includes(searchTerm.toLowerCase()) || m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRegion = regionFilter ? m.serviceArea?.includes(regionFilter) : true;
    return matchesSearch && matchesRegion;
  });

  const regions = Array.from(new Set(members.map(m => m.serviceArea).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">לוח הקהילה לעסקים</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            ברוכים הבאים למאגר שיתופי הפעולה של לקוחות המשרד. כאן תוכלו למצוא ולפרסם בעלי מקצוע שונים.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2 rounded-full shadow-lg">
          <Plus className="h-4 w-4" />
          פרסם את העסק שלי
        </Button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">הוספת מודעה חדשה</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <CardDescription>הצג את העסק שלך לשאר חברי הקהילה</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form id="add-member-form" onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">שם העסק / בעל המקצוע *</label>
                    <Input 
                      placeholder="לדוגמה: כהן ובניו שיפוצים" 
                      value={newMember.name} 
                      onChange={e => setNewMember({...newMember, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">תחום התמחות *</label>
                    <Input 
                      placeholder="לדוגמה: שיפוצים, רואה חשבון, מעצב גרפי" 
                      value={newMember.occupation} 
                      onChange={e => setNewMember({...newMember, occupation: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">אזור שירות</label>
                    <Input 
                      placeholder="לדוגמה: אזור המרכז, ירושלים והסביבה" 
                      value={newMember.serviceArea} 
                      onChange={e => setNewMember({...newMember, serviceArea: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">מספר טלפון ליצירת קשר *</label>
                    <Input 
                      placeholder="לדוגמה: 050-1234567" 
                      value={newMember.phone} 
                      onChange={e => setNewMember({...newMember, phone: e.target.value})}
                      required
                      type="tel"
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="bg-muted/20 border-t justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>ביטול</Button>
                <Button form="add-member-form" type="submit">פרסם מודעה</Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-none shadow-sm">
      <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-3xl">
        <CardTitle className="text-2xl flex items-center gap-3 text-primary">
          <Users className="h-6 w-6" />
          הקהילה שלנו
        </CardTitle>
        <CardDescription className="text-base">
          ברוכים הבאים למאגר שיתופי הפעולה של לקוחות המשרד. חפשו בעלי מקצוע וצרו קשר ישירות.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="חיפוש בעל מקצוע או שם..."
              className="pr-12 h-12 rounded-full bg-muted/50 border-transparent focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={regionFilter === '' ? 'default' : 'outline'}
              className="rounded-full rounded-tr-full rounded-br-full"
              onClick={() => setRegionFilter('')}
            >
              הכל
            </Button>
            {regions.map((region) => (
              <Button
                key={region}
                variant={regionFilter === region ? 'default' : 'outline'}
                className="rounded-full whitespace-nowrap"
                onClick={() => setRegionFilter(region || '')}
              >
                {region}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary font-bold text-xl">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{member.occupation || 'עצמאי'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                {member.serviceArea && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 w-fit px-3 py-1.5 rounded-full text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{member.serviceArea}</span>
                  </div>
                )}
                
                {member.phone && (
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors" 
                    nativeButton={false}
                    onClick={() => {
                      toast.info(`הודעה מתועדת: בוצעה יצירת קשר עם ${member.name} דרך הלוח. (נשלח למשרד להצהרה)`);
                    }}
                    render={<a href={`tel:${member.phone}`} />}
                  >
                        <Phone className="h-4 w-4" />
                        חייג: {member.phone}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          
          {filteredMembers.length === 0 && (
             <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Search className="h-8 w-8 opacity-20 mb-2" />
                <p>לא מצאנו בעלי מקצוע שמתאימים לחיפוש שלך.</p>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
