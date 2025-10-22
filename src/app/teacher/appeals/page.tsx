"use client";

import { useEffect, useState } from 'react';
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
import { Inbox, Check, X, Loader } from 'lucide-react';
import { Appeal, Exam, Submission } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where, orderBy, getDocs, runTransaction } from 'firebase/firestore';
import { app } from '@/firebase/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function AppealDetailsDialog({ appeal }: { appeal: Appeal }) {
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Apelyasiya Detalları</DialogTitle>
                <DialogDescription>
                    <span className="font-semibold">{appeal.studentName}</span> tərəfindən <span className="font-semibold">"{appeal.examTitle}"</span> imtahanı üçün göndərilib.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                    <h4 className="font-medium">Sual:</h4>
                    <p className="p-3 bg-muted rounded-md text-sm">{appeal.questionText}</p>
                </div>
                <div className="space-y-1">
                    <h4 className="font-medium">Şagirdin Səbəbi:</h4>
                    <p className="p-3 bg-muted rounded-md text-sm">{appeal.reason}</p>
                </div>
            </div>
        </DialogContent>
    );
}

export default function AppealsPage() {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const db = getFirestore(app);

    useEffect(() => {
        setLoading(true);

        const appealsQuery = query(collection(db, 'appeals'), where('status', '==', 'pending'), orderBy('submittedAt', 'desc'));

        const unsubscribe = onSnapshot(appealsQuery, (snapshot) => {
            const appealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
            setAppeals(appealsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db]);


    const handleAcceptAppeal = async (appeal: Appeal) => {
        const appealRef = doc(db, "appeals", appeal.id);
        const examRef = doc(db, "exams", appeal.examId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const examDoc = await transaction.get(examRef);
                if (!examDoc.exists()) {
                    throw new Error("İmtahan tapılmadı!");
                }
                const examData = examDoc.data() as Exam;
                const pointsToAdd = examData.pointsPerQuestion;

                const submissionQuery = query(collection(db, 'submissions'), where('examId', '==', appeal.examId), where('studentId', '==', appeal.studentId));
                const submissionSnapshot = await getDocs(submissionQuery);

                if (submissionSnapshot.empty) {
                    throw new Error("Şagirdin təqdimatı tapılmadı!");
                }
                
                const submissionRef = submissionSnapshot.docs[0].ref;
                const submissionDoc = await transaction.get(submissionRef);

                 if (!submissionDoc.exists()) {
                    throw new Error("Təqdimat sənədi mövcud deyil!");
                }

                const submissionData = submissionDoc.data() as Submission;

                const currentScore = submissionData.score || 0;
                const currentAdjustment = submissionData.manualScoreAdjustment || 0;
                
                transaction.update(submissionRef, { 
                    score: currentScore + pointsToAdd,
                    manualScoreAdjustment: currentAdjustment + pointsToAdd 
                });
                transaction.update(appealRef, { status: 'resolved' });
            });

            toast({
                title: "Apelyasiya Qəbul Edildi",
                description: `${appeal.studentName} üçün şagirdin balı artırıldı.`,
            });

        } catch (error: any) {
            console.error("Error accepting appeal: ", error);
            toast({
                title: "Xəta",
                description: error.message || "Apelyasiya qəbul edilərkən xəta baş verdi.",
                variant: "destructive",
            });
        }
    };

    const handleRejectAppeal = async (appealId: string) => {
       const appealRef = doc(db, "appeals", appealId);
       try {
         await updateDoc(appealRef, {
            status: 'rejected'
         });
         toast({
            title: "Apelyasiya Rədd Edildi",
            variant: "destructive",
        });
       } catch (error) {
         console.error("Error rejecting appeal: ", error);
         toast({
            title: "Xəta",
            description: "Müraciəti rədd edərkən xəta baş verdi.",
            variant: "destructive",
         });
       }
    };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Inbox className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="font-headline text-4xl">Apelyasiya Müraciətləri</CardTitle>
              <CardDescription>
                Şagirdlərin imtahan nəticələri ilə bağlı göndərdiyi müraciətlər.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şagird</TableHead>
                <TableHead>İmtahan</TableHead>
                <TableHead>Göndərilmə Tarixi</TableHead>
                <TableHead className="text-right">Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2">
                           <Loader className="h-5 w-5 animate-spin" />
                           <span>Müraciətlər yüklənir...</span>
                        </div>
                    </TableCell>
                 </TableRow>
              ) : appeals.length > 0 ? appeals.map((appeal) => {
                return (
                  <TableRow key={appeal.id}>
                    <TableCell className="font-medium">{appeal.studentName}</TableCell>
                    <TableCell>{appeal.examTitle}</TableCell>
                    <TableCell>{new Date(appeal.submittedAt).toLocaleString('az-AZ')}</TableCell>
                    <TableCell className="text-right space-x-2">
                        <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="outline" size="sm">Ətraflı Bax</Button>
                            </DialogTrigger>
                            <AppealDetailsDialog appeal={appeal} />
                        </Dialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                                    <X className="mr-2 h-4 w-4" />
                                    Rədd et
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Bu müraciəti rədd etməyə əminsiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu əməliyyat müraciəti "rədd edilmiş" kimi qeyd edəcək və siyahıdan siləcək. Bu əməliyyat geri qaytarıla bilməz.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRejectAppeal(appeal.id)} className="bg-red-600 hover:bg-red-700">
                                    Bəli, Rədd Et
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Check className="mr-2 h-4 w-4" />
                                    Qəbul et
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Bu müraciəti qəbul etməyə əminsiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu əməliyyat şagirdin balını avtomatik olaraq yeniləyəcək və müraciəti "həll edilmiş" kimi qeyd edəcək. Bu əməliyyat geri qaytarıla bilməz.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAcceptAppeal(appeal)} className="bg-green-600 hover:bg-green-700">
                                    Bəli, Qəbul Et
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Heç bir aktiv apelyasiya müraciəti yoxdur.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    