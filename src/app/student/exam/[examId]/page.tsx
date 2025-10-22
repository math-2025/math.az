"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Student, Submission, Exam } from '@/lib/types';
import { ExamTimer } from '@/components/exam-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Download } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getFirestore, doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { app } from '@/firebase/config';

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const examId = params.examId as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const hasFinishedRef = useRef(false);
  const db = getFirestore(app);

  useEffect(() => {
    const studentData = localStorage.getItem('currentStudent');
    if (studentData) {
      setStudent(JSON.parse(studentData));
    } else {
      router.push('/');
      return;
    }

    const fetchExam = async () => {
        if (!examId) return;
        const examRef = doc(db, "exams", examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
            setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
        } else {
            toast({
                variant: "destructive",
                title: "İmtahan tapılmadı",
                description: "Bu imtahan mövcud deyil və ya silinib."
            });
            router.push('/student/dashboard');
        }
        setIsLoading(false);
    }
    
    fetchExam();
  }, [examId, router, toast, db]);

  const handleFinishExam = useCallback(async (cheating = false) => {
    if (hasFinishedRef.current || !student || !exam) return;
    hasFinishedRef.current = true;

    // Calculate initial score
    let score = 0;
    exam.questions.forEach(q => {
        if (answers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
            score += exam.pointsPerQuestion;
        }
    });

    const newSubmission: Omit<Submission, 'id'> = {
      examId,
      studentId: student.id,
      answers,
      submittedAt: new Date().toISOString(),
      cheatingDetected: cheating,
      score: score,
      manualScoreAdjustment: 0,
    };
    
    try {
        await addDoc(collection(db, "submissions"), newSubmission);
        if (cheating) {
            toast({
                variant: "destructive",
                title: "Köçürmə Təsbit Olundu!",
                description: "Köçürdüyünüz təsbit olundu, bu səbəbdən imtahandan xaric olundunuz. Müəllim bu barədə məlumatlandırılacaq.",
                duration: 10000,
            });
        } else {
            toast({
              title: "Cavablarınız qəbul edildi!",
              description: "Nəticələr açıqlandıqda müəlliminiz sizi məlumatlandıracaq.",
            });
        }
        router.push(`/student/dashboard`);
    } catch(error) {
        console.error("Error submitting exam:", error);
        toast({
            variant: "destructive",
            title: "Xəta",
            description: "İmtahanı təhvil verərkən xəta baş verdi.",
        });
        hasFinishedRef.current = false; // Allow retry
    }

  }, [examId, student, answers, router, toast, exam, db]);

  useEffect(() => {
    if (!exam || isLoading) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFinishExam(true);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleFinishExam(true);
      }
    };
    
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Tam ekran rejiminə keçid zamanı xəta: ${err.message} (${err.name})`);
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, isLoading]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };
  
  if (isLoading || !exam || !student) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-8">
                <Card className="p-6"><Skeleton className="h-40 w-full" /></Card>
                <Card className="p-6"><Skeleton className="h-40 w-full" /></Card>
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-6 lg:sticky top-24 h-min">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{exam.title}</CardTitle>
              <CardDescription>Bütün sualları bacardığınız qədər cavablandırın. Hər sual {exam.pointsPerQuestion} bal dəyərindədir.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-8">
                {exam.questions.map((q, index) => (
                  <Card key={q.id} className="p-6">
                    <div className="mb-4">
                      <Label className="text-lg font-semibold block">
                        Sual {index + 1}: {q.text}
                      </Label>
                      {q.fileUrl && (
                        <div className="mt-4">
                          {q.fileType?.startsWith('image/') ? (
                            <div className="relative h-64 w-full">
                              <Image src={q.fileUrl} alt={`Sual ${index + 1} şəkli`} layout="fill" objectFit="contain" className="rounded-md" />
                            </div>
                          ) : q.fileType === 'application/pdf' ? (
                            <a href={q.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                              <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                {q.fileName || 'PDF Faylı Aç'}
                              </Button>
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {q.type === 'multiple-choice' && q.options ? (
                      <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, value)}>
                        <div className="space-y-2">
                          {q.options.map((option, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`${q.id}-${i}`} />
                              <Label htmlFor={`${q.id}-${i}`}>{option}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    ) : (
                      <Textarea
                        placeholder="Cavabınız..."
                        className="min-h-[120px]"
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      />
                    )}
                  </Card>
                ))}
              </form>
            </CardContent>
          </Card>
        </div>
        
        <aside className="space-y-6 lg:sticky top-24 h-min">
          <ExamTimer endTime={exam.endTime} onTimeUp={() => handleFinishExam(false)} />
          <Button className="w-full h-12" onClick={() => handleFinishExam(false)}>
            <Send className="mr-2"/> İmtahanı bitir & Təhvil ver
          </Button>
           <Button variant="outline" className="w-full" onClick={() => router.back()}>
            <ArrowLeft className="mr-2"/> Geri Qayıt
          </Button>
        </aside>
      </div>
    </div>
  );
}
