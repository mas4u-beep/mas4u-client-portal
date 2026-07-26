import React, { useState } from 'react';
import { Archive, Search, Filter, Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Document } from '@/src/types';

interface DocumentArchiveProps {
  documents: Document[];
}

export function DocumentArchive({ documents }: DocumentArchiveProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('all');

  const parsedDocs = documents.map(doc => {
    let dateObj = new Date(doc.date);
    // fallback if it's the old DD/MM/YYYY format
    if (isNaN(dateObj.getTime()) && doc.date.includes('/')) {
      const parts = doc.date.split('/');
      dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return { ...doc, dateObj, year: isNaN(dateObj.getTime()) ? 'non-date' : dateObj.getFullYear().toString() };
  });

  const years = ['all', ...new Set(parsedDocs.map(doc => doc.year).filter(y => y !== 'non-date'))].sort((a, b) => b.localeCompare(a));

  const filteredDocs = parsedDocs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (doc.category?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesYear = filterYear === 'all' || doc.year === filterYear;
    return matchesSearch && matchesYear;
  });

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">ארכיון מסמכים רב-שנתי</CardTitle>
              <CardDescription>כל המסמכים והדוחות שלך מסודרים לפי שנים</CardDescription>
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
            <select 
              className="h-10 rounded-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              {years.map(year => (
                <option key={year} value={year}>{year === 'all' ? 'כל השנים' : year}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-right py-4 px-6">שם המסמך</TableHead>
              <TableHead className="text-right py-4 px-6">קטגוריה</TableHead>
              <TableHead className="text-right py-4 px-6">תאריך</TableHead>
              <TableHead className="text-left py-4 px-6">פעולה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <TableRow key={doc.id} className="group hover:bg-primary/5 transition-colors">
                  <TableCell className="font-medium py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <FileText className="h-4 w-4" />
                      </div>
                      {doc.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <Badge variant="outline" className="font-normal">
                      {doc.category || 'כללי'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                       <Calendar className="h-3 w-3" />
                       {!isNaN(doc.dateObj.getTime()) ? doc.dateObj.toLocaleDateString('he-IL') : doc.date}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <Button variant="ghost" size="sm" className="gap-2 text-primary hover:bg-primary hover:text-white rounded-full">
                      <Download className="h-3 w-3" />
                      הורדה
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  לא נמצאו מסמכים התואמים את החיפוש
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
