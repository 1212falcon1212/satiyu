'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/hesabim';
  const { customer, login, isLoading } = useCustomerAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (customer) {
      router.replace(redirect);
    }
  }, [customer, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Başarıyla giriş yapıldı.');
      router.push(redirect);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    }
  };

  if (customer) return null;

  return (
    <div className="container-main flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-secondary-200 bg-white p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
              <LogIn className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Giriş Yap</h1>
            <p className="mt-1 text-sm text-secondary-500">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="örnek@email.com"
            />
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Şifrenizi girin"
            />
            <Button type="submit" className="w-full" loading={isLoading}>
              Giriş Yap
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-secondary-500">
            Hesabınız yok mu?{' '}
            <Link href="/kayit" className="font-medium text-primary-600 hover:text-primary-700">
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
