import React, { useState } from 'react';
import { User, Shield, Building, Briefcase, TrendingUp, Mail, Lock, User as UserIcon, MapPin, Hash, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User as UserType } from '@/src/types';

interface SettingsViewProps {
  user: UserType;
  onUpdateProfile?: (updates: { name: string; email: string }) => void | Promise<void>;
}

export function SettingsView({ user, onUpdateProfile }: SettingsViewProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        alert('הסיסמאות אינן תואמות, אנא בדק');
        return;
      }
    }
    if (!name.trim() || !email.trim()) {
      alert('יש למלא שם ואימייל');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateProfile?.({ name: name.trim(), email: email.trim() });
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Personal & Security */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                <CardTitle>פרטים אישיים ואבטחה</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא</Label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pr-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-9" />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה חדשה</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">אימות סיסמה</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm" type="password" placeholder="********" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-9" />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Button className="rounded-full px-8 font-bold" onClick={handleSave} disabled={isSaving}>{isSaving ? 'שומר...' : 'שמור שינויים'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>פרטי תיק ומיסוי</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">מספר ח.פ / עוסק מורשה</Label>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Hash className="h-4 w-4 text-primary" />
                    {user.companyId || 'לא הוזן'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">מספר תיק ניכויים</Label>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Hash className="h-4 w-4 text-primary" />
                    {user.deductionsId || 'אין תיק ניכויים'}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">דיווח מע"מ</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-4 py-1">
                      {user.vatFrequency || 'לא מוגדר'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">דיווח מס הכנסה</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-4 py-1">
                      {user.incomeTaxFrequency || 'לא מוגדר'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Office Info & Tips */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <CardTitle>ניהול התיק במשרד</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs opacity-70">מיקום ניהול התיק:</p>
                <p className="font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {user.officeLocation}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs opacity-70">אחראי/ת תיק אישי:</p>
                <p className="font-bold flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  {user.assignedEmployee}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
            <CardHeader className="bg-accent/10 border-b border-accent/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <CardTitle className="text-accent">עצות ייעול ושיפור</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {user.efficiencyTips?.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <div className="h-5 w-5 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
