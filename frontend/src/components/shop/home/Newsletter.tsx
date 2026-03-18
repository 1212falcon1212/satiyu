'use client';

import { useState, type FormEvent } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

interface NewsletterProps {
  title?: string;
  subtitle?: string;
}

export function Newsletter({ title, subtitle }: NewsletterProps = {}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <section className="bg-accent py-8">
      <div className="container-main text-center text-white">
        <Mail className="mx-auto h-7 w-7 text-white/80" />
        <h2 className="mt-3 text-lg font-bold lg:text-xl">
          {title || 'Bültenimize Abone Olun'}
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {subtitle || 'Yeni ürünler ve özel indirimleri kaçırmayın.'}
        </p>

        {status === 'success' ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-sm font-medium">Başarıyla abone oldunuz!</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-4 flex max-w-md flex-col gap-2 px-4 sm:flex-row sm:px-0"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              required
              className="h-11 w-full rounded-l-lg border-0 px-4 text-sm text-primary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-white/30 sm:flex-1 sm:rounded-r-none"
            />
            <button
              type="submit"
              className="h-11 w-full flex-shrink-0 rounded-lg bg-secondary-900 text-sm font-semibold uppercase tracking-wider text-white hover:bg-secondary-800 transition-colors sm:w-auto sm:px-6 sm:rounded-l-none sm:rounded-r-lg"
            >
              Abone Ol
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
