"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Student } from '@/lib/types';
import { useRouter } from 'next/navigation';

type UserNavProps = {
  userType: 'teacher' | 'student';
};

export function UserNav({ userType }: UserNavProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSubtitle, setUserSubtitle] = useState('');

  useEffect(() => {
    if (userType === 'teacher') {
      setUserName('Dr. Anar Hüseynov');
      setUserEmail('anar.huseynov'); // this is used for avatar generation
    } else if (userType === 'student') {
      const studentData = localStorage.getItem('currentStudent');
      if (studentData) {
        const student: Student = JSON.parse(studentData);
        setUserName(student.name);
        setUserEmail(student.email || student.id);
        setUserSubtitle(`Qrup: ${student.group}`);
      }
    }
  }, [userType]);
  
  const handleLogout = () => {
    localStorage.removeItem("currentStudent");
    localStorage.removeItem("userType");
    router.push('/');
  }

  const initials = userName ? userName.split(' ').map(n => n[0]).join('') : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://avatar.vercel.sh/${userEmail}.png`} alt={`@${userName}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            {userSubtitle ? (
               <p className="text-xs leading-none text-muted-foreground">
                {userSubtitle}
               </p>
            ) : (
               <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={userType === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}>
                İdarə Paneli
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
            Çıxış
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
