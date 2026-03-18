'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { customer, register, isLoading } = useCustomerAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    if (customer) {
      router.replace('/hesabim');
    }
  }, [customer, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    try {
      await register(name, email, password, phone || undefined);
      toast.success('Hesabınız oluşturuldu!');
      router.push('/hesabim');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errors = error.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0]?.[0];
        toast.error(firstError || 'Kayıt başarısız.');
      } else {
        toast.error(error.response?.data?.message || 'Kayıt başarısız.');
      }
    }
  };

  if (customer) return null;

  return (
    <div className="container-main flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-secondary-200 bg-white p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
              <UserPlus className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Kayıt Ol</h1>
            <p className="mt-1 text-sm text-secondary-500">Yeni bir hesap oluşturun</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Ad Soyad"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ad Soyad"
            />
            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="örnek@email.com"
            />
            <Input
              label="Telefon (Opsiyonel)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
            />
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="En az 8 karakter"
            />
            <Input
              label="Şifre Tekrar"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              placeholder="Şifrenizi tekrar girin"
            />
            <Button type="submit" className="w-full" loading={isLoading}>
              Kayıt Ol
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-secondary-500">
            Zaten hesabınız var mı?{' '}
            <Link href="/giris" className="font-medium text-primary-600 hover:text-primary-700">
              Giriş yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
