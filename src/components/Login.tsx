import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: { name: string; email: string }) => void;
}

// Mock database of users
const MOCK_USERS: Record<string, { name: string; email: string; code: string }> = {
  '12345': { name: 'ישראל ישראלי', email: 'israel@example.com', code: '12345' },
  '67890': { name: 'שרה כהן', email: 'sarah@example.com', code: '67890' },
};

export function Login({ onLogin }: LoginProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const user = MOCK_USERS[code];
      if (user) {
        onLogin({ name: user.name, email: user.email });
      } else {
        setError('קוד שגוי. אנא נסה שוב או פנה לתמיכה.');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">פורטל Mas4U</CardTitle>
            <CardDescription className="text-base">
              הזן את הקוד האישי שקיבלת מאיתנו כדי להתחבר
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">קוד אישי</Label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="לדוגמה: 12345"
                    className="pr-10 text-center text-lg tracking-[0.5em] font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    aria-label="הזן קוד אישי"
                  />
                </div>
              </div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </motion.div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full text-lg h-12" 
                disabled={isLoading}
              >
                {isLoading ? 'מתחבר...' : 'כניסה למערכת'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          שכחת את הקוד? <a href="#" className="font-medium text-primary hover:underline">צור קשר עם המשרד</a>
        </p>
      </motion.div>
    </div>
  );
}
