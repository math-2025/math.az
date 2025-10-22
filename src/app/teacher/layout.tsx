"use client";

import { SiteHeader } from '@/components/site-header';
import { AppWrapper } from '@/firebase/app-wrapper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType !== 'teacher') {
      router.replace('/');
    } else {
      setIsAuth(true);
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading || !isAuth) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppWrapper>
        <div className="relative flex min-h-screen flex-col">
        <SiteHeader userType="teacher" />
        <main className="flex-1">{children}</main>
        </div>
    </AppWrapper>
  );
}
