"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShieldAlert, CheckCircle, XCircle, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Exam, Submission, Student } from '@/lib/types';
import { parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { getFirestore, collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '@/firebase/config';

function StudentResultDetails({ exam, submission, student }: { exam: Exam; submission: Submission; student: Student }) {

  if (!exam || !submission) return null;
  
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">
          {student.name} üçün Təqdimat Detalları
        </DialogTitle>
        {submission.cheatingDetected && (
            <div className="flex items-center gap-2 pt-2 text-destructive">
                <ShieldAlert className="h-5 w-5"/>
                <span className="font-semibold">Potensial köçürmə aşkarlandı.</span>
            </div>
        )}
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-6">
        {exam.questions.map((q, index) => {
            const studentAnswer = submission.answers[q.id] || 'Cavablandırılmayıb';
            const isCorrect = studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

            return (
            <Card key={q.id}>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Sual {index + 1}</CardTitle>
                    <Badge variant={isCorrect ? 'default' : 'secondary'} className={isCorrect ? 'bg-green-500 hover:bg-green-500' : ''}>
                        {isCorrect ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                        {isCorrect ? `+${exam.pointsPerQuestion} Bal` : '+0 Bal'}
                    </Badge>
                </div>
                <p className="text-muted-foreground pt-2">{q.text}</p>
                {q.fileUrl && (
                    <div className="mt-4">
                      {q.fileType?.startsWith('image/') ? (
                        <div className="relative h-48 w-full">
                            <Image src={q.fileUrl} alt={`Sual ${index + 1} şəkli`} layout="fill" objectFit="contain" className="rounded-md" />
                        </div>
                      ) : q.fileType === 'application/pdf' ? (
                          <a href={q.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                            <Button variant="secondary">
                                <Download className="mr-2 h-4 w-4" />
                                {q.fileName || 'PDF Faylına Bax'}
                            </Button>
                          </a>
                      ) : null}
                    </div>
                )}
                </CardHeader>
                <CardContent className="space-y-4">
                <div>
                    <p className="font-semibold mb-1">Şagirdin Cavabı:</p>
                    <p className="p-3 bg-muted rounded-md">{studentAnswer}</p>
                </div>
                {!isCorrect && (
                    <div>
                        <p className="font-semibold mb-1">Düzgün Cavab:</p>
                        <p className="p-3 bg-green-100 dark:bg-green-900/50 rounded-md">{q.correctAnswer}</p>
                    </div>
                )}
                </CardContent>
            </Card>
            );
        })}
        </div>
      </ScrollArea>
    </DialogContent>
  );
}


export default function TeacherResultsPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
        const examRef = doc(db, 'exams', examId);
        const examSnap = await getDoc(examRef);
        if (examSnap.exists()) {
            setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        }
    };
    
    const unsubscribeStudents = onSnapshot(collection(db, "students"), (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(studentsData);
    });

    const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
        const submissionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setSubmissions(submissionsData);
        setLoading(false);
    });

    fetchExam();

    return () => {
        unsubscribeStudents();
        unsubscribeSubmissions();
    }
  }, [examId, db]);

  const groupedResults = submissions.reduce((acc, sub) => {
    const student = students.find((s) => s.id === sub.studentId);
    if (!student || !exam) return acc;
  
    const studentScore = sub.score || 0;
  
    const processedResult = {
      ...sub,
      student,
      studentScore,
    };
  
    if (!acc[student.group]) {
      acc[student.group] = [];
    }
    acc[student.group].push(processedResult);
  
    return acc;
  }, {} as Record<string, (Submission & { student: Student; studentScore: number })[]>);

  Object.keys(groupedResults).forEach(group => {
    groupedResults[group].sort((a, b) => {
        if (a.studentScore !== b.studentScore) {
          return b.studentScore - a.studentScore;
        }
        return parseISO(a.submittedAt).getTime() - parseISO(b.submittedAt).getTime();
    });
  });

  if (loading) {
     return (
       <div className="container py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
             <Skeleton className="h-10 w-3/4" />
             <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">İmtahan tapılmadı</h1>
      </div>
    );
  }

  const hasSubmissions = submissions.length > 0;

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">"{exam.title}" üçün nəticələr</CardTitle>
          <CardDescription>
            Şagirdlərin performansının və təqdimatlarının siniflərə görə qruplaşdırılmış icmalı.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSubmissions ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Hələ heç bir təqdimat yoxdur.</p>
              </div>
          ) : (
            <div className="space-y-8">
                {Object.entries(groupedResults).map(([group, results]) => (
                  <div key={group}>
                    <h3 className="font-headline text-2xl font-bold mb-4">Qrup: {group}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Şagird</TableHead>
                          <TableHead>Təhvil verildiyi vaxt</TableHead>
                          <TableHead className="text-center">Bal</TableHead>
                          <TableHead className="text-center">Köçürmə İşarəsi</TableHead>
                          <TableHead className="text-right">Əməliyyatlar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result) => {
                          const totalPossibleScore = exam.questions.length * exam.pointsPerQuestion;
                          return (
                            <TableRow key={result.studentId}>
                              <TableCell className="font-medium">{result.student?.name}</TableCell>
                              <TableCell>{new Date(result.submittedAt).toLocaleString('az-AZ')}</TableCell>
                              <TableCell className="text-center">{result.studentScore} / {totalPossibleScore}</TableCell>
                              <TableCell className="text-center">
                                  {result.cheatingDetected && <ShieldAlert className="h-5 w-5 text-destructive mx-auto" />}
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ətraflı Bax
                                    </Button>
                                  </DialogTrigger>
                                  <StudentResultDetails exam={exam} submission={result} student={result.student} />
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
