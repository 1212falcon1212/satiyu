'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';

export default function IletisimPage() {
  const settings = useSettings();
  const general = settings.general;

  const contactInfo = useMemo(() => [
    { icon: MapPin, label: 'Adres', value: general?.address || '' },
    { icon: Phone, label: 'Telefon', value: general?.site_phone || '' },
    { icon: Mail, label: 'E-posta', value: general?.site_email || '' },
    { icon: Clock, label: 'Çalışma Saatleri', value: general?.working_hours || '' },
  ], [general]);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'İsim zorunludur.';
    if (!form.email.trim()) errs.email = 'E-posta zorunludur.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Geçerli bir e-posta girin.';
    if (!form.subject.trim()) errs.subject = 'Konu zorunludur.';
    if (!form.message.trim()) errs.message = 'Mesaj zorunludur.';
    return errs;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus('sending');
    setTimeout(() => {
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 4000);
    }, 1000);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 bg-grain">
        <div className="container-main relative z-10 py-12 text-center text-white lg:py-16">
          <h1 className="font-display text-3xl font-bold lg:text-4xl">İletişim</h1>
          <p className="mt-2 text-primary-200">Size nasıl yardımcı olabiliriz?</p>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-secondary-900">Bize Yazın</h2>
            <p className="mt-1 text-sm text-secondary-500">Formu doldurarak bize ulaşabilirsiniz.</p>

            {status === 'sent' ? (
              <div className="mt-6 rounded-xl border border-success/20 bg-success/5 p-6 text-center">
                <p className="text-sm font-medium text-success">Mesajınız başarıyla gönderildi! En kısa sürede döneceğiz.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Adınız Soyadınız"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    error={errors.name}
                    required
                  />
                  <Input
                    label="E-posta Adresiniz"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    error={errors.email}
                    required
                  />
                </div>
                <Input
                  label="Konu"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  error={errors.subject}
                  required
                />
                <Textarea
                  label="Mesajınız"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  error={errors.message}
                  rows={6}
                  required
                />
                <Button type="submit" variant="accent" loading={status === 'sending'}>
                  {status === 'sending' ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                </Button>
              </form>
            )}
          </div>

          {/* Info sidebar */}
          <div>
            <h2 className="font-display text-xl font-bold text-secondary-900">İletişim Bilgileri</h2>
            <div className="mt-6 space-y-5">
              {contactInfo.map((item) => (
                item.value ? (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <item.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{item.label}</p>
                      <p className="text-sm text-secondary-600">{item.value}</p>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
