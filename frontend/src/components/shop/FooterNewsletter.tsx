'use client';

import { useState, type FormEvent } from 'react';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const settings = useSettings();
  const social = settings.social ?? {};

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">
        Bülten
      </h4>
      <p className="text-sm text-secondary-400 mb-4">
        Yeni koleksiyonlar ve kampanyalardan haberdar olun.
      </p>

      {subscribed ? (
        <p className="text-sm text-green-400">Başarıyla abone oldunuz!</p>
      ) : (
        <form onSubmit={handleSubscribe} className="flex">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            required
            className="h-10 flex-1 rounded-l-sm border-0 bg-white/10 px-3 text-sm text-white placeholder:text-secondary-500 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="h-10 rounded-r-sm bg-accent px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-accent-600 transition-colors"
          >
            Abone Ol
          </button>
        </form>
      )}

      {/* Social icons */}
      {(social.instagram_url || social.facebook_url || social.twitter_url || social.youtube_url) && (
        <div className="mt-4 flex gap-2">
          {social.instagram_url && (
            <a href={social.instagram_url} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-white" aria-label="Instagram">
              <Instagram className="h-3.5 w-3.5" />
            </a>
          )}
          {social.facebook_url && (
            <a href={social.facebook_url} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-white" aria-label="Facebook">
              <Facebook className="h-3.5 w-3.5" />
            </a>
          )}
          {social.twitter_url && (
            <a href={social.twitter_url} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-white" aria-label="Twitter">
              <Twitter className="h-3.5 w-3.5" />
            </a>
          )}
          {social.youtube_url && (
            <a href={social.youtube_url} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-white" aria-label="YouTube">
              <Youtube className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
