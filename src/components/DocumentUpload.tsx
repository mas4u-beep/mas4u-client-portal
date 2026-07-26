import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, Lock, Bot, Camera, Loader2, AlertCircle, Type } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Document } from '@/src/types';
import Tesseract from 'tesseract.js';

interface DocumentUploadProps {
  documents: Document[];
  onUpload: (files: File[], purpose: string, extractedText?: Record<string, string>) => void;
  onLockMonth: () => void;
  onScanDocuments: () => void;
}

export function DocumentUpload({ documents, onUpload, onLockMonth, onScanDocuments }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [purpose, setPurpose] = useState('מסמכים שוטפים');
  const [extractedTexts, setExtractedTexts] = useState<Record<string, string>>({});

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newProgress: Record<string, number> = {};
    Array.from(files).forEach(file => {
      newProgress[file.name] = 0;
    });
    setUploadProgress(newProgress);
    
    const newExtractedTexts: Record<string, string> = {};
    const fileArray = Array.from(files);
    
    // Process OCR and progress
    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
         try {
           const { data: { text } } = await Tesseract.recognize(
             file,
             'heb+eng',
             { 
               logger: m => {
                 if (m.status === 'recognizing text') {
                   setUploadProgress(prev => ({
                     ...prev,
                     [file.name]: m.progress * 100
                   }));
                 } else if (m.progress < 1) {
                   setUploadProgress(prev => ({
                     ...prev,
                     [file.name]: (m.progress * 20) // initializing up to 20%
                   }));
                 }
               }
             }
           );
           newExtractedTexts[file.name] = text;
           setExtractedTexts(prev => ({...prev, [file.name]: text}));
         } catch (error) {
           console.error("OCR Failed for", file.name, error);
           setUploadProgress(prev => ({...prev, [file.name]: 100}));
         }
      } else {
         // Simulate fast upload for non-images
         setUploadProgress(prev => ({...prev, [file.name]: 100}));
      }
    }

    setIsUploading(false);
    setUploadSuccessMessage('הקבצים הועלו ונותחו בהצלחה!');
    onUpload(fileArray, purpose, newExtractedTexts);
    setTimeout(() => {
      setUploadProgress({});
      setUploadSuccessMessage('');
    }, 3000);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [purpose, onUpload]);

  const now = new Date();
  const currentMonthDocs = documents.filter(doc => {
    const docDateTime = new Date(doc.date).getTime();
    let docDate = new Date(doc.date);
    if (isNaN(docDateTime) && doc.date.includes('/')) {
        const parts = doc.date.split('/');
        docDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (isNaN(docDate.getTime())) return false;
    return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full p-4 sm:p-8 lg:p-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">העלאת מסמכים</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            העלאה וסריקה של מסמכים לחודש הנוכחי ({now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })})
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <Button onClick={onScanDocuments} variant="outline" className="flex-1 md:flex-none gap-2 rounded-full border-primary/20 hover:bg-primary/5">
             <Bot className="h-4 w-4 text-primary" />
             <span className="hidden md:inline">סריקת AI חכמה</span>
             <span className="md:hidden">סריקה חכמה</span>
           </Button>
           <Button onClick={onLockMonth} className="flex-1 md:flex-none gap-2 rounded-full shadow-lg">
             <Lock className="h-4 w-4" />
             נעל חודש
           </Button>
        </div>
      </div>

      <Card 
        className={cn(
          "border-2 border-dashed transition-all duration-300",
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-primary/20 bg-card/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <CardContent className="p-6 md:p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className={cn("h-8 w-8 md:h-10 md:w-10 text-primary transition-transform", isDragging && "animate-bounce")} />
          </div>
          <div>
            <CardTitle className="text-xl md:text-2xl font-black">העלאה מהירה של מסמכים</CardTitle>
            <CardDescription className="text-sm md:text-base mt-2">גרור קבצים לכאן או לחץ לבחירה (PDF, תמונות, Excel) - תומך בהעלאה מרובה</CardDescription>
          </div>
          
          <AnimatePresence>
            {Object.keys(uploadProgress).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-md space-y-3 mt-4"
              >
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <div key={fileName} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="truncate max-w-[200px]">{fileName}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
            {uploadSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-md bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mt-4 border border-green-200"
              >
                <CheckCircle2 className="h-4 w-4" />
                {uploadSuccessMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-3 mt-4 w-full max-w-md">
            <select
              className="flex h-12 w-full rounded-full border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={isUploading}
            >
              <option value="מסמכים שוטפים">מסמכים שוטפים</option>
              <option value="לבדיקת המשרד">לבדיקת המשרד</option>
              <option value="מסמכים לדוח השנתי">מסמכים לדוח השנתי</option>
            </select>
            <div className="flex gap-2 w-full">
              <input
                type="file"
                id="file-upload-multiple"
                className="hidden"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button 
                className="rounded-full flex-1 h-12 font-bold shadow-lg"
                onClick={() => document.getElementById('file-upload-multiple')?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin ml-2" /> : null}
                בחירת קבצים
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
        <CardHeader className="bg-primary/5 border-b border-primary/10 px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            הועלו החודש
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            מסמכים אלו פתוחים לעריכה ולסריקה חכמה. בסיום החודש או בלחיצה על "נעל חודש", הם יועברו אוטומטית ל'המסמכים שלי'.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">שם המסמך</th>
                  <th className="p-4 font-medium whitespace-nowrap">תאריך העלאה</th>
                  <th className="p-4 font-medium whitespace-nowrap">סיווג אוטומטי (AI)</th>
                  <th className="p-4 font-medium whitespace-nowrap">מטרה</th>
                  <th className="p-4 font-medium whitespace-nowrap">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentMonthDocs.map(doc => {
                  const docDateTime = new Date(doc.date).getTime();
                  let docDate = new Date(doc.date);
                  if (isNaN(docDateTime) && doc.date.includes('/')) {
                      const parts = doc.date.split('/');
                      docDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  }
                  
                  return (
                  <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium flex items-center gap-2 max-w-[200px] truncate">
                       <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                       <span className="truncate">{doc.name}</span>
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {!isNaN(docDate.getTime()) ? docDate.toLocaleDateString('he-IL') : doc.date}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {doc.category ? (
                         <Badge variant="outline" className="bg-secondary text-secondary-foreground border-secondary">
                           <Bot className="h-3 w-3 mr-1 ml-1 inline" />
                           {doc.category}
                         </Badge>
                      ) : (
                         <span className="text-muted-foreground text-xs flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse block"></span> ממתין לסריקה</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-primary/5 text-xs">
                        {doc.purpose || 'כללי'}
                      </Badge>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {doc.status === 'pending' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין</Badge>}
                      {doc.status === 'approved' && <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">אושר</Badge>}
                      {doc.status === 'rejected' && <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">נדחה</Badge>}
                      {doc.status === 'duplicate' && <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">כפילות</Badge>}
                      {doc.status === 'unrecognized' && <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">לא זוהה</Badge>}
                    </td>
                  </tr>
                )})}
                {currentMonthDocs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      לא הועלו מסמכים החודש. העלה קבצים כדי להתחיל.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-start gap-4">
           <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0 mt-1">
             <AlertCircle className="h-5 w-5" />
           </div>
           <div>
             <h3 className="font-bold text-blue-900 text-lg mb-1">כיצד עובדת הסריקה החכמה?</h3>
             <p className="text-blue-800/80 text-sm leading-relaxed mb-3">
               המערכת שלנו כוללת בוט בינה מלאכותית המסוגל לקרוא מסמכים בקבוצות גדולות, לחלץ נתונים כמו סכומים, תאריכים, סוג הוצאה, ולסווג אותם במדויק. לחץ על הלחצן "סריקת AI חכמה" בראש הדף כדי שהבוט יתחיל לעבוד.
             </p>
             <p className="text-blue-800/80 text-sm leading-relaxed">
               כאשר אתה מעלה מסמכים שוטפים לאורך החודש, הם יופיעו כאן. בסיום החודש, או בלחיצה על "נעל חודש", ננעלת האפשרות לעריכתם והם מועברים לארכיון המשרדי ולעמוד "המסמכים שלי" כחודש דיווח סגור ומוכן לעבודת רואה החשבון.
             </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
