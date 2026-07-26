import React, { useRef, useState } from 'react';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DigitalSignatureProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
}

export function DigitalSignature({ onSave, onCancel }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-primary/20">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">חתימה דיגיטלית</CardTitle>
        </div>
        <CardDescription>חתום עם האצבע או העכבר בתוך המסגרת</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="border-2 border-muted rounded-lg bg-white overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={clear}>
            <RotateCcw className="h-4 w-4" />
            נקה
          </Button>
          <Button variant="outline" className="flex-1 gap-2 text-destructive hover:bg-destructive/10" onClick={onCancel}>
            <X className="h-4 w-4" />
            ביטול
          </Button>
          <Button className="flex-1 gap-2" onClick={save}>
            <Check className="h-4 w-4" />
            שמור חתימה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
