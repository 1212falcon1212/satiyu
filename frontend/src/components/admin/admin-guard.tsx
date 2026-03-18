'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist hydration before doing anything
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. fast sync storage)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    async function verify() {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        router.replace('/admin/login');
        return;
      }

      try {
        await checkAuth();
      } catch {
        // checkAuth failed — don't force logout here, it already
        // sets user/token to null on failure
      }

      setIsChecking(false);
    }

    verify();
  }, [hydrated, checkAuth, router]);

  useEffect(() => {
    if (!isChecking && !user && hydrated) {
      router.replace('/admin/login');
    }
  }, [isChecking, user, hydrated, router]);

  if (!hydrated || isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-secondary-500">Dogrulaniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
