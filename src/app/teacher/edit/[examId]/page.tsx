"use client";

import { CreateExamForm } from '@/components/create-exam-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppWrapper } from '@/firebase/app-wrapper';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Exam } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function EditExamPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const examId = params.examId as string;
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const db = getFirestore(app);

    useEffect(() => {
        if (!examId) return;

        const fetchExam = async () => {
            const examRef = doc(db, 'exams', examId);
            const examSnap = await getDoc(examRef);

            if (examSnap.exists()) {
                const examData = { id: examSnap.id, ...examSnap.data() } as Exam;

                // Security Check: Prevent editing of started or past exams
                if (isPast(parseISO(examData.startTime))) {
                    toast({
                        variant: 'destructive',
                        title: 'Redaktə Mümkün Deyil',
                        description: 'Artıq başlamış və ya bitmiş imtahanları redaktə etmək olmaz.',
                    });
                    router.push('/teacher/dashboard');
                    return;
                }

                setExam(examData);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'İmtahan Tapılmadı',
                });
                router.push('/teacher/dashboard');
            }
            setLoading(false);
        };

        fetchExam();
    }, [examId, db, router, toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader className="h-8 w-8 animate-spin" />
                <p className="ml-4 text-lg">İmtahan məlumatları yüklənir...</p>
            </div>
        );
    }

    return (
        <AppWrapper>
            <div className="container py-12">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                <CardTitle className="font-headline text-4xl">İmtahanı Redaktə Et</CardTitle>
                <CardDescription>
                    "{exam?.title}" imtahanının məlumatlarını dəyişdirin. Yadda saxladıqdan sonra dəyişikliklər qüvvəyə minəcək.
                </CardDescription>
                </CardHeader>
                <CardContent>
                {exam && <CreateExamForm existingExam={exam} />}
                </CardContent>
            </Card>
            </div>
        </AppWrapper>
    );
}
