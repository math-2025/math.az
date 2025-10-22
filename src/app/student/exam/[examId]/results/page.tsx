"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowLeft, Download, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Student, Submission, Exam, Appeal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { getFirestore, getDoc, getDocs, collection, query, where, doc, addDoc } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function AppealDialog({ student, exam, question, onAppealSent }: { student: Student; exam: Exam; question: any; onAppealSent: (questionId: string) => void; }) {
    const [reason, setReason] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const db = getFirestore(app);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast({ variant: 'destructive', title: 'Səbəb boş ola bilməz' });
            return;
        }
        setIsSending(true);
        const appealData: Omit<Appeal, 'id'> = {
            studentId: student.id,
            studentName: student.name,
            examId: exam.id,
            examTitle: exam.title,
            questionId: question.id,
            questionText: question.text,
            reason: reason,
            submittedAt: new Date().toISOString(),
            status: 'pending',
        };

        try {
            await addDoc(collection(db, 'appeals'), appealData);
            toast({ title: 'Apelyasiya Müraciətiniz Göndərildi', description: 'Müəlliminiz müraciətinizə baxdıqdan sonra sizinlə əlaqə saxlayacaq.' });
            onAppealSent(question.id);
        } catch (error) {
            console.error('Error submitting appeal:', error);
            toast({ variant: 'destructive', title: 'Xəta', description: 'Müraciət göndərilərkən xəta baş verdi.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>"{question.text}" üçün apelyasiya</DialogTitle>
                <DialogDescription>
                    Niyə bu sualın nəticəsinin yanlış olduğunu düşündüyünüzü ətraflı izah edin.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="reason">Səbəb</Label>
                <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Məsələn: Düzgün cavab variantlarda yox idi və ya mənim cavabım da düzgün hesab edilməlidir, çünki..."
                    className="min-h-[120px] mt-2"
                />
            </div>
            <DialogFooter>
                 <Button onClick={handleSubmit} disabled={isSending}>
                    {isSending ? 'Göndərilir...' : <><Send className="mr-2"/> Göndər</>}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function ExamResultsPage() {
  const params = useParams();
  const examId = params.examId as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealedQuestions, setAppealedQuestions] = useState<string[]>([]);
  const db = getFirestore(app);

  useEffect(() => {
    const studentData = localStorage.getItem('currentStudent');
    if (studentData) {
      const parsedStudent = JSON.parse(studentData);
      setStudent(parsedStudent);

      const fetchData = async () => {
        setLoading(true);
        // Fetch exam
        const examRef = doc(db, "exams", examId);
        const examSnap = await getDoc(examRef);
        if (examSnap.exists()) {
          setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        }

        // Fetch submission
        const submissionsRef = collection(db, "submissions");
        const subQuery = query(submissionsRef, where("examId", "==", examId), where("studentId", "==", parsedStudent.id));
        const subSnapshot = await getDocs(subQuery);

        if (!subSnapshot.empty) {
          const subDoc = subSnapshot.docs[0];
          setSubmission({ id: subDoc.id, ...subDoc.data() } as Submission);
        }
        
        // Fetch existing appeals for this student and exam
        const appealsRef = collection(db, 'appeals');
        const appealQuery = query(appealsRef, where("examId", "==", examId), where("studentId", "==", parsedStudent.id));
        const appealSnapshot = await getDocs(appealQuery);
        const appealedIds = appealSnapshot.docs.map(doc => doc.data().questionId);
        setAppealedQuestions(appealedIds);

        setLoading(false);
      }
      fetchData();
    } else {
        setLoading(false);
    }
  }, [examId, db]);
  
  const handleAppealSent = (questionId: string) => {
    setAppealedQuestions(prev => [...prev, questionId]);
  };

  if (loading) {
    return (
       <div className="container py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
             <Skeleton className="h-10 w-3/4" />
             <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-8">
             <div>
              <h3 className="text-2xl font-bold mb-4 font-headline">Ətraflı Təhlil</h3>
               <div className="space-y-6">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam || !submission || !student) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">Nəticələr tapılmadı</h1>
        <p>Bu imtahan üçün nəticələr tapılmadı və ya siz bu imtahanı verməmisiniz.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/student/dashboard">İdarə Panelinə Qayıt</Link>
        </Button>
      </div>
    );
  }

  const studentScore = submission.score || 0;
  const totalQuestions = exam.questions.length;
  const totalPossibleScore = totalQuestions * exam.pointsPerQuestion;
  const percentage = totalPossibleScore > 0 ? (studentScore / totalPossibleScore) * 100 : 0;
  
  let correctCount = 0;
  exam.questions.forEach(q => {
      if (submission.answers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          correctCount++;
      }
  });
  // Add manually adjusted score to correct count for display
  const adjustedCorrectCount = correctCount + ((submission.manualScoreAdjustment || 0) / exam.pointsPerQuestion);


  return (
    <div className="container py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-4xl">İmtahan Nəticələri</CardTitle>
              <CardDescription className="text-lg">{exam.title}</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-3xl font-bold text-primary">{studentScore} / {totalPossibleScore}</p>
                <p className="text-muted-foreground">{percentage.toFixed(0)}% ({totalQuestions}-dən {adjustedCorrectCount} düz)</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {submission.cheatingDetected && (
             <Card className="bg-destructive/10 border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Köçürmə Aşkarlandı</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/80">
                        Köçürmə cəhdiniz aşkarlandı və buna görə imtahanınız ləğv edildi. Müəlliminizə məlumat verilib.
                    </p>
                </CardContent>
             </Card>
          )}

          <div>
            <h3 className="text-2xl font-bold mb-4 font-headline">Ətraflı Təhlil</h3>
            <div className="space-y-6">
              {exam.questions.map((q, index) => {
                const studentAnswer = submission.answers[q.id] || 'Cavablandırılmayıb';
                const isCorrect = studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                const hasAppealed = appealedQuestions.includes(q.id);

                return (
                  <Card key={q.id}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Sual {index + 1}</CardTitle>
                            <Badge variant={isCorrect ? 'default' : 'destructive'} className="bg-green-500 hover:bg-green-600 text-white data-[variant=destructive]:bg-red-500 data-[variant=destructive]:hover:bg-red-600">
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
                            <p className="font-semibold mb-1">Sizin Cavabınız:</p>
                            <p className="p-3 bg-muted rounded-md">{studentAnswer}</p>
                        </div>
                         {!isCorrect && (
                            <div>
                                <p className="font-semibold mb-1">Düzgün Cavab:</p>
                                <p className="p-3 bg-green-100 dark:bg-green-900/50 rounded-md">{q.correctAnswer}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                      <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="sm" disabled={hasAppealed}>
                                {hasAppealed ? 'Müraciət Göndərilib' : 'Apelyasiya et'}
                            </Button>
                        </DialogTrigger>
                        {!hasAppealed && <AppealDialog student={student} exam={exam} question={q} onAppealSent={handleAppealSent}/>}
                      </Dialog>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-8">
            <Button asChild>
              <Link href="/student/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                İdarə Panelinə Qayıt
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
