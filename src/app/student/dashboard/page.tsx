"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, ListChecks, Calendar, ArrowRight, Hourglass, Loader, Megaphone, Lock } from 'lucide-react';
import {
  isPast,
  isFuture,
  parseISO,
  formatDistanceToNow,
  formatDistance,
} from 'date-fns';
import { az } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Student, Exam, Submission } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { collection, getDocs, getFirestore, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '@/firebase/config';

export default function StudentDashboard() {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentExams, setStudentExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore(app);

  useEffect(() => {
    const studentData = localStorage.getItem('currentStudent');
    if (studentData) {
      const parsedStudent: Student = JSON.parse(studentData);
      setCurrentStudent(parsedStudent);

      const examsQuery = query(collection(db, "exams"), where("assignedGroups", "array-contains", parsedStudent.group));
      const submissionsQuery = query(collection(db, "submissions"), where("studentId", "==", parsedStudent.id));

      const unsubscribeExams = onSnapshot(examsQuery, (querySnapshot) => {
        const examsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        setStudentExams(examsData);
        setIsLoading(false);
      });
      
      const unsubscribeSubmissions = onSnapshot(submissionsQuery, (querySnapshot) => {
        const submissionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setSubmissions(submissionsData);
      });

      return () => {
        unsubscribeExams();
        unsubscribeSubmissions();
      };
    } else {
        setIsLoading(false);
    }
  }, [db]);
  
  const announcements = studentExams.filter(exam => exam.announcement).map(exam => ({
    examTitle: exam.title,
    announcement: exam.announcement
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader className="h-8 w-8 animate-spin" />
      <p className="ml-4 text-lg">Şagird məlumatları yüklənir...</p>
    </div>;
  }
  
  if (!currentStudent) {
    return <div className="container py-8 text-center text-lg text-destructive">
      Şagird məlumatları tapılmadı. Zəhmət olmasa yenidən daxil olun.
      <Button asChild variant="link" className="mt-4">
        <Link href="/">Girişə get</Link>
      </Button>
    </div>;
  }
  
  const getExamStatus = (examId: string, startTime: string, endTime: string) => {
    const hasSubmitted = submissions.some(sub => sub.examId === examId && sub.studentId === currentStudent.id);
    const end = parseISO(endTime);
    
    if (hasSubmitted) {
        if (isPast(end)) {
            return { label: 'Tamamlanıb', cta: 'Nəticələrə bax' } as const;
        }
        return { label: 'Təhvil verilib', variant: 'outline', cta: 'Nəticələr bağlıdır' } as const;
    }
    
    const start = parseISO(startTime);

    if (isFuture(start)) return { label: `${formatDistanceToNow(start, { locale: az })} sonra başlayır`, variant: 'outline', cta: 'Başlamayıb' } as const;
    if (isPast(end)) return { label: 'Bitib', variant: 'destructive', cta: 'Qaçırılıb' } as const;
    
    return { label: 'Davam edir', variant: 'default', cta: 'İmtahana başla' } as const;
  };

  return (
    <div className="container py-8 select-none">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">
          Xoş gəlmisən, {currentStudent.name}!
        </h1>
        <p className="text-muted-foreground text-lg">
          Mövcud imtahanlarınız bunlardır. Uğurlar!
        </p>
      </div>
      
       {announcements.length > 0 && (
        <Card className="mb-8 bg-primary/10 border-primary/20">
          <CardHeader>
             <div className="flex items-center gap-4">
                <Megaphone className="h-6 w-6 text-primary"/>
                <CardTitle className="text-primary/90">Elanlar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {announcements.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="font-semibold">{item.examTitle}</AccordionTrigger>
                  <AccordionContent>
                    {item.announcement}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {studentExams.length === 0 ? (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>Mövcud İmtahan Yoxdur</CardTitle>
                <CardDescription>Hazırda qrupunuza təyin edilmiş heç bir imtahan yoxdur.</CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentExams.map((exam) => {
            const status = getExamStatus(exam.id, exam.startTime, exam.endTime);
            const isActionable = status.cta === 'İmtahana başla' || status.cta === 'Nəticələrə bax';
            const linkHref = status.cta === 'İmtahana başla' ? `/student/exam/${exam.id}` : status.cta === 'Nəticələrə bax' ? `/student/exam/${exam.id}/results` : '#';

            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-2xl">{exam.title}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <CardDescription>Bacarıqlarınızın qiymətləndirilməsi.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ListChecks className="mr-2 h-4 w-4" />
                    <span>{exam.questions.length} sual</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Müddət: {formatDistance(parseISO(exam.endTime), parseISO(exam.startTime), { locale: az })}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {isFuture(parseISO(exam.startTime)) ? <Calendar className="mr-2 h-4 w-4" /> : <Hourglass className="mr-2 h-4 w-4" />}
                    <span>{isFuture(parseISO(exam.startTime)) ? `${new Date(exam.startTime).toLocaleString('az-AZ')} tarixində başlayır`: `${formatDistanceToNow(parseISO(exam.endTime), { locale: az })} sonra bitir`}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" disabled={!isActionable}>
                      <Link href={linkHref}>
                        {status.cta === 'Nəticələrə bax' && <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {status.cta === 'İmtahana başla' && <ArrowRight className="mr-2 h-4 w-4" />}
                        {status.cta === 'Nəticələr bağlıdır' && <Lock className="mr-2 h-4 w-4" />}
                        {status.cta}
                      </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
