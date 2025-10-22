"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center space-y-4 p-4">
      <Loader className="h-8 w-8 animate-spin" />
      <p className="text-muted-foreground">Giriş səhifəsinə yönləndirilir...</p>
    </main>
  );
}
