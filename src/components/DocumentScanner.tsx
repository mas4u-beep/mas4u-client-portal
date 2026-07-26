import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Camera, Upload, FileSearch, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

// Lazily create the AI client so a missing API key does not crash the whole app on load.
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!_ai) {
    try {
      _ai = new GoogleGenAI({ apiKey });
    } catch {
      return null;
    }
  }
  return _ai;
}

interface DocumentScannerProps {
  onScanComplete: (category: string, confidence: number) => void;
}

export function DocumentScanner({ onScanComplete }: DocumentScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ category: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        analyzeDocument(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeDocument = async (base64Data: string) => {
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      // Remove data:image/xxx;base64, prefix
      const base64Content = base64Data.split(',')[1];

      const ai = getAI();
      if (!ai) {
        setError('סריקה אוטומטית אינה זמינה כרגע (חסר מפתח API). ניתן לסווג את המסמך ידנית.');
        setIsScanning(false);
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Content } },
            { text: "Analyze this document image. Identify if it is a 'דוח שנתי', 'אישור ניכוי מס', 'טופס 106', or 'אחר'. Return only a JSON object with 'category' and 'confidence' (0-1)." }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);
      onScanComplete(data.category, data.confidence);
    } catch (err) {
      console.error('Scanner error:', err);
      setError('לא הצלחנו לזהות את המסמך באופן אוטומטי. תוכל לסווג אותו ידנית.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4">
        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">סורק מסמכים חכם</CardTitle>
                <CardDescription>צלם או העלה מסמך לזיהוי אוטומטי</CardDescription>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="gap-2" onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4" />
                  העלאת קובץ
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-4"
            >
              <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-lg overflow-hidden border shadow-lg">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {isScanning ? (
                <div className="flex items-center justify-center gap-2 text-primary animate-pulse">
                  <FileSearch className="h-5 w-5" />
                  <span className="font-bold">מנתח מסמך באמצעות AI...</span>
                </div>
              ) : result ? (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span className="font-bold">זוהה כ: {result.category}</span>
                  </div>
                  <span className="text-xs opacity-70">ביטחון: {Math.round(result.confidence * 100)}%</span>
                </div>
              ) : error ? (
                <div className="bg-amber-100 text-amber-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : null}

              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                ביטול והעלאה מחדש
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
