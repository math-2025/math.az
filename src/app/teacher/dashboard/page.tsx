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
import { PlusCircle, Clock, Users, ListChecks, Eye, Trash2, ShieldAlert, Megaphone, UserCog, Loader, Pencil, Inbox } from 'lucide-react';
import { isPast, isFuture, parseISO, formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Exam } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { collection, onSnapshot, getFirestore, deleteDoc, doc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/firebase/config';


function AnnounceDialog({ exam, onUpdate }: { exam: Exam, onUpdate: (examId: string, announcement: string) => void}) {
  const [announcement, setAnnouncement] = useState(exam.announcement || '');
  const { toast } = useToast();

  const handleSave = () => {
    onUpdate(exam.id, announcement);
    toast({ title: 'Elan yadda saxlanıldı!', description: `"${exam.title}" üçün elanınız dərc edildi.` });
  };
  
  return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>"{exam.title}" üçün elan verin</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="announcement-text">Elan</Label>
            <Textarea 
                id="announcement-text"
                placeholder="məs., 15-ci sual tipoqrafik səhvə görə ləğv edilib."
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="min-h-[100px] mt-2"
            />
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button type="button" onClick={handleSave}>Yadda saxla və elan et</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
  );
}


export default function TeacherDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const db = getFirestore(app);

  useEffect(() => {
    const examsQuery = query(collection(db, "exams"));
    const unsubscribe = onSnapshot(examsQuery, (snapshot) => {
        const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)).sort((a,b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
        setExams(examsData);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const getExamStatus = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);

    if (isFuture(start)) return { label: `Qarşıdan gələn`, variant: 'outline' } as const;
    if (isPast(end)) return { label: 'Bitmiş', variant: 'secondary' } as const;
    return { label: 'Canlı', variant: 'default' } as const;
  };

  const handleDeleteExam = async (examId: string) => {
    const batch = writeBatch(db);
    
    // Reference to the exam document
    const examRef = doc(db, "exams", examId);
    
    // Query for all submissions related to the exam
    const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
    
    try {
        const submissionsSnapshot = await getDocs(submissionsQuery);
        // Add deletions of submissions to the batch
        submissionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Add deletion of the exam to the batch
        batch.delete(examRef);

        await batch.commit();
        toast({
            title: "İmtahan Silindi",
            description: "İmtahan və ona aid bütün təqdimatlar uğurla silindi."
        });
    } catch (error) {
        console.error("Error deleting exam and submissions:", error);
        toast({
            variant: "destructive",
            title: "Xəta",
            description: "İmtahan silinərkən xəta baş verdi."
        });
    }
  };
  
  const handleUpdateExam = async (examId: string, announcement: string) => {
    const examRef = doc(db, "exams", examId);
    try {
        await updateDoc(examRef, { announcement });
    } catch(error) {
        console.error("Error updating announcement: ", error);
        toast({ variant: "destructive", title: "Xəta", description: "Elan yenilənərkən xəta baş verdi." });
    }
  };

  if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="h-8 w-8 animate-spin" />
          <p className="ml-4 text-lg">Məlumatlar yüklənir...</p>
        </div>
      );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold">
            Müəllim İdarə Paneli
          </h1>
          <p className="text-muted-foreground text-lg">
            İmtahanlarınızı idarə edin və şagirdlərin irəliləyişini izləyin.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
                <Link href="/teacher/students">
                    <UserCog className="mr-2 h-4 w-4" />
                    Şagirdlər
                </Link>
            </Button>
            <Button asChild>
                <Link href="/teacher/appeals">
                    <Inbox className="mr-2 h-4 w-4" />
                    Apelyasiyalar
                </Link>
            </Button>
            <Button asChild variant="destructive">
                <Link href="/teacher/cheaters">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Köçürənlər
                </Link>
            </Button>
            <Button asChild>
              <Link href="/teacher/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni İmtahan
              </Link>
            </Button>
        </div>
      </div>

      {exams.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>Heç Bir İmtahan Yaradılmayıb</CardTitle>
                <CardDescription>Başlamaq üçün yeni bir imtahan yaradın.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                  <Link href="/teacher/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni İmtahan Yarat
                  </Link>
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const status = getExamStatus(exam.startTime, exam.endTime);
            const isUpcoming = isFuture(parseISO(exam.startTime));

            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-2xl">{exam.title}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <CardDescription>
                    {status.label === 'Canlı' ? `${formatDistanceToNow(parseISO(exam.endTime), { locale: az })} sonra bitir`: `${new Date(exam.startTime).toLocaleDateString('az-AZ')} tarixində baş tutdu`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ListChecks className="mr-2 h-4 w-4" />
                    <span>{exam.questions.length} sual</span>
                  </div>
                  <div className="flex items-start text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                        {exam.assignedGroups.map(group => (
                            <Badge key={group} variant="secondary" className="font-normal">{group}</Badge>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>{new Date(exam.startTime).toLocaleString('az-AZ')}</span>
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2">
                  <Button asChild className="w-full" variant="outline">
                      <Link href={`/teacher/results/${exam.id}`}>
                        <Eye className="mr-2" />
                        Nəticələr
                      </Link>
                  </Button>
                  
                  {isUpcoming ? (
                    <Button asChild className="w-full" variant="secondary">
                        <Link href={`/teacher/edit/${exam.id}`}>
                            <Pencil className="mr-2"/> Redaktə Et
                        </Link>
                    </Button>
                  ) : (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="secondary"><Megaphone className="mr-2"/> Elan ver</Button>
                        </DialogTrigger>
                        <AnnounceDialog exam={exam} onUpdate={handleUpdateExam}/>
                    </Dialog>
                  )}
                  
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full col-span-2">
                              <Trash2 className="mr-2"/> İmtahanı Sil
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>İmtahanı silməyə əminsiniz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bu əməliyyat geri qaytarıla bilməz. Bu, imtahanı və ona aid bütün təqdimatları həmişəlik siləcək.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteExam(exam.id)} className="bg-destructive hover:bg-destructive/90">
                                  Bəli, Sil
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
