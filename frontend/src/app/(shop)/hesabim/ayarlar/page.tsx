'use client';

import { useState } from 'react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function SettingsPage() {
  const { customer, token } = useCustomerAuthStore();
  const setCustomer = useCustomerAuthStore((s) => s.checkAuth);

  // Profile form
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  if (!customer) return null;

  const authHeaders = { Authorization: `Bearer ${token}` };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSaving(true);

    try {
      await api.put('/customer/auth/profile', { name, email, phone: phone || null }, { headers: authHeaders });
      // Refresh customer data in store
      await setCustomer();
      toast.success('Profil bilgileri güncellendi.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      if (error.response?.data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(error.response.data.errors)) {
          mapped[key] = msgs[0];
        }
        setProfileErrors(mapped);
      } else {
        toast.error('Profil güncellenemedi.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    if (newPassword !== confirmPassword) {
      setPasswordErrors({ password_confirmation: 'Şifreler eşleşmiyor.' });
      return;
    }

    setPasswordSaving(true);

    try {
      await api.put(
        '/customer/auth/profile',
        {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        },
        { headers: authHeaders }
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Şifreniz başarıyla değiştirildi.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      if (error.response?.data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(error.response.data.errors)) {
          mapped[key] = msgs[0];
        }
        setPasswordErrors(mapped);
      } else {
        toast.error('Şifre değiştirilemedi.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">Ayarlar</h1>
      <p className="mt-1 text-sm text-secondary-500">Hesap bilgilerinizi ve şifrenizi güncelleyin.</p>

      {/* Profile Info */}
      <form onSubmit={handleProfileSubmit} className="mt-6 rounded-xl border border-secondary-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-secondary-900">Kişisel Bilgiler</h2>
        <p className="mt-0.5 text-sm text-secondary-500">İsim, e-posta ve telefon bilgilerinizi güncelleyin.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Ad Soyad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={profileErrors.name}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={profileErrors.email}
            required
          />
          <Input
            label="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={profileErrors.phone}
            placeholder="05xx xxx xx xx"
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" loading={profileSaving}>
            Kaydet
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordSubmit} className="mt-4 rounded-xl border border-secondary-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-secondary-900">Şifre Değiştir</h2>
        <p className="mt-0.5 text-sm text-secondary-500">Güvenliğiniz için güçlü bir şifre seçin.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Mevcut Şifre"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordErrors.current_password}
              required
            />
          </div>
          <Input
            label="Yeni Şifre"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordErrors.password}
            required
            hint="En az 8 karakter"
          />
          <Input
            label="Yeni Şifre (Tekrar)"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordErrors.password_confirmation}
            required
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" loading={passwordSaving}>
            Şifreyi Değiştir
          </Button>
        </div>
      </form>
    </div>
  );
}
