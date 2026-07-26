import React, { useState, useMemo } from 'react';
import { FileText, Search, Upload, Filter, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Document } from '@/src/types';

interface MyDocumentsProps {
  documents: Document[];
  onNavigateToUpload?: () => void;
}

export function MyDocuments({ documents, onNavigateToUpload }: MyDocumentsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Group and sort logic
  const { groupedDocs, availableYears } = useMemo(() => {
    const parsedDocs = documents.map(doc => {
      let dateObj = new Date(doc.date);
      if (isNaN(dateObj.getTime()) && doc.date.includes('/')) {
        const parts = doc.date.split('/');
        dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return { ...doc, dateObj, year: isNaN(dateObj.getTime()) ? '1970' : dateObj.getFullYear().toString(), month: isNaN(dateObj.getTime()) ? '1' : String(dateObj.getMonth() + 1).padStart(2, '0') };
    });

    const filtered = parsedDocs.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (doc.category?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const grouped: Record<string, Record<string, typeof parsedDocs>> = {};
    const yearsSet = new Set<string>();

    filtered.forEach(doc => {
      const y = doc.year;
      const m = doc.month;
      yearsSet.add(y);
      if (!grouped[y]) grouped[y] = {};
      if (!grouped[y][m]) grouped[y][m] = [];
      grouped[y][m].push(doc);
    });

    return { 
      groupedDocs: grouped, 
      availableYears: Array.from(yearsSet).sort((a, b) => b.localeCompare(a)) 
    };
  }, [documents, searchTerm]);

  const monthNames: Record<string, string> = {
    '01': 'ינואר', '02': 'פברואר', '03': 'מרץ', '04': 'אפריל', '05': 'מאי', '06': 'יוני',
    '07': 'יולי', '08': 'אוגוסט', '09': 'ספטמבר', '10': 'אוקטובר', '11': 'נובמבר', '12': 'דצמבר'
  };

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">המסמכים שלי</CardTitle>
              <CardDescription>מסמכים והוצאות שהעלית ממוינים לפי חודשים ושנים</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="חיפוש מסמך..." 
                className="pr-9 rounded-full bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="rounded-full gap-2" onClick={() => onNavigateToUpload && onNavigateToUpload()}>
              <Upload className="h-4 w-4" />
              העלאת מסמך
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {availableYears.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            לא נמצאו מסמכים.
          </div>
        ) : (
          <div className="space-y-8">
            {availableYears.map(year => (
              <div key={year} className="space-y-4">
                <h3 className="text-2xl font-bold border-b pb-2 text-primary">{year}</h3>
                
                <div className="space-y-6">
                  {Object.keys(groupedDocs[year]).sort((a, b) => b.localeCompare(a)).map(month => (
                    <div key={`${year}-${month}`} className="bg-muted/30 rounded-2xl p-4">
                      <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {monthNames[month]} {year}
                      </h4>
                      <Table>
                        <TableBody>
                          {groupedDocs[year][month].map(doc => (
                            <TableRow key={doc.id} className="group hover:bg-background transition-colors border-b-0">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p>{doc.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {!isNaN(doc.dateObj.getTime()) ? doc.dateObj.toLocaleDateString('he-IL') : doc.date}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {doc.category || 'כללי'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left">
                                <Button variant="ghost" size="sm" className="gap-2 text-primary hover:bg-primary hover:text-white rounded-full">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
