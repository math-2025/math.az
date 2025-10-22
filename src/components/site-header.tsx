import Link from 'next/link';
import { Calculator, ShieldAlert, UserCog, Inbox } from 'lucide-react';
import { UserNav } from './user-nav';
import { Button } from './ui/button';

type SiteHeaderProps = {
  userType: 'teacher' | 'student';
};

export function SiteHeader({ userType }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg font-bold">Riyaziyyat İmtahanı</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {userType === 'teacher' ? (
            <>
              <Link
                href="/teacher/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                İdarə Paneli
              </Link>
              <Link
                href="/teacher/create"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                İmtahan Yarat
              </Link>
              <Link
                href="/teacher/students"
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
              >
                <UserCog className="h-4 w-4"/> Şagirdlər
              </Link>
              <Link
                href="/teacher/appeals"
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
              >
                <Inbox className="h-4 w-4"/> Apelyasiyalar
              </Link>
               <Link
                href="/teacher/cheaters"
                className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2"
              >
                <ShieldAlert className="h-4 w-4 text-destructive"/> Köçürənlər
              </Link>
            </>
          ) : (
             <Link
                href="/student/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                İdarə Paneli
              </Link>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav userType={userType} />
        </div>
      </div>
    </header>
  );
}
