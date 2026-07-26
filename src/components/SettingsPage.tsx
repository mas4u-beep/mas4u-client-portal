import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Bell, Shield, Globe, CreditCard, Mail } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>הגדרות פרופיל</CardTitle>
            </div>
            <CardDescription>נהל את הפרטים האישיים שלך</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <div className="p-2 bg-background rounded-md border border-border">ישראל ישראלי</div>
            </div>
            <div className="space-y-2">
              <Label>דואר אלקטרוני</Label>
              <div className="p-2 bg-background rounded-md border border-border">israel@example.com</div>
            </div>
            <Button className="w-full">עדכן פרטים</Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>התראות</CardTitle>
            </div>
            <CardDescription>בחר איך לקבל עדכונים מהמשרד</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>התראות במייל</Label>
                <p className="text-xs text-muted-foreground">קבל עדכון על מסמכים שאושרו</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>התראות WhatsApp</Label>
                <p className="text-xs text-muted-foreground">עדכונים דחופים ישירות לנייד</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>דיוור שיווקי</Label>
                <p className="text-xs text-muted-foreground">עדכוני חקיקה וזכויות חדשות</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>אבטחה</CardTitle>
            </div>
            <CardDescription>שמור על החשבון שלך מוגן</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              שינוי סיסמה
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              אימות דו-שלבי (2FA)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>פרטי תשלום</CardTitle>
            </div>
            <CardDescription>ניהול אמצעי תשלום וחשבוניות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-[10px] font-bold">VISA</div>
                <span className="text-sm font-medium">**** 4242</span>
              </div>
              <Button variant="ghost" size="sm">ערוך</Button>
            </div>
            <Button variant="outline" className="w-full">היסטוריית תשלומים</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
