import React, { useState } from 'react';
import { Lightbulb, ShieldCheck, BookOpen, ArrowLeft, Clock, Search, Info, ExternalLink, Coins, FileText, Headphones, AlignLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'motion/react';
import { KnowledgeArticle } from '@/src/types';

interface KnowledgeBaseProps {
  articles: KnowledgeArticle[];
  showTitle?: boolean;
}

export function KnowledgeBase({ articles, showTitle = true }: KnowledgeBaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [activeTab, setActiveTab] = useState('articles');

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIconByCategory = (category: string) => {
    switch (category) {
      case 'מיסוי': 
      case 'מס הכנסה': return <Coins className="h-5 w-5" />;
      case 'זכויות רפואיות':
      case 'ביטוח לאומי': return <ShieldCheck className="h-5 w-5" />;
      case 'החזרי מס': return <FileText className="h-5 w-5" />;
      case 'טיפים וכלים': return <Lightbulb className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  if (selectedArticle) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={() => setSelectedArticle(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          חזרה
        </Button>
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full">{selectedArticle.category}</Badge>
              <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                <ShieldCheck className="h-3 w-3 ml-1" />
                מידע מאומת
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedArticle.readTime} קריאה
              </span>
            </div>
            <CardTitle className="text-3xl font-black">{selectedArticle.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <p className="text-xl font-medium text-muted-foreground leading-relaxed">
              {selectedArticle.excerpt}
            </p>
            <div className="text-lg leading-relaxed whitespace-pre-wrap">
              {selectedArticle.content}
            </div>
            <div className="mt-12 p-6 rounded-2xl bg-muted/50 border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">המידע עובר עדכון חי מול ספרי החוקים והנחיות רשות המיסים.</p>
              </div>
              <Button variant="outline" className="rounded-full gap-2 border-primary/20 hover:bg-primary/5">
                למידע נוסף באתר הממשלתי
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-primary">מרכז ידע וזכויות</h2>
            <p className="text-muted-foreground mt-1">מאגר מתעדכן, מאומת ואמין - כולל מאמרים, פודקאסטים וסיכומים.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="חפש נושא, זכות או מאמר..." 
              className="pr-9 rounded-full bg-background border-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <Tabs defaultValue="articles" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 p-1 rounded-full mb-6 mx-auto sm:mx-0">
          <TabsTrigger value="articles" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2">
            <FileText className="h-4 w-4" />
            מאמרים
          </TabsTrigger>
          <TabsTrigger value="podcasts" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2">
            <Headphones className="h-4 w-4" />
            פודקאסטים
          </TabsTrigger>
          <TabsTrigger value="summaries" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2">
            <AlignLeft className="h-4 w-4" />
            סיכומים
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="articles" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {filteredArticles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedArticle(article)}
                className="cursor-pointer"
              >
                <Card className="group hover:shadow-lg transition-all border-primary/10 bg-card/50 backdrop-blur overflow-hidden h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10">
                        {article.category}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs px-2 py-0 h-5">
                        <ShieldCheck className="h-3 w-3" />
                        מאומת
                      </Badge>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          {getIconByCategory(article.category)}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      </div>
                      <Button variant="link" className="p-0 h-auto text-primary font-bold">
                        קרא עוד
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="podcasts" className="mt-0">
           <Card className="border-none shadow-sm bg-primary/5 text-center p-12">
             <Headphones className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
             <h3 className="text-2xl font-bold text-primary mb-2">פודקאסטים מקצועיים (בקרוב)</h3>
             <p className="text-muted-foreground max-w-md mx-auto">
               ספריית שמע מקיפה שתעזור לך להבין מושגי מס והחזרים מאומתים בזמן הנסיעה לעבודה או בבית.
             </p>
           </Card>
        </TabsContent>

        <TabsContent value="summaries" className="mt-0">
           <Card className="border-none shadow-sm bg-primary/5 text-center p-12">
             <AlignLeft className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
             <h3 className="text-2xl font-bold text-primary mb-2">סיכומי מאמרים ממוקדים</h3>
             <p className="text-muted-foreground max-w-md mx-auto">
               בקרוב תעלה מערכת בינה מלאכותית המסכמת מאמרים שלמים לפסקת מפתח אחת, שתגיש לך רק את המספרים והנתונים הקריטיים.
             </p>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
