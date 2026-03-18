import Link from 'next/link';
import { Phone, Mail, Clock, Instagram, Facebook, Twitter, Youtube } from 'lucide-react';
import type { SiteSettings } from '@/types/api';

interface TopBarProps {
  settings: SiteSettings;
}

export function TopBar({ settings }: TopBarProps) {
  const general = settings.general ?? {};
  const social = settings.social ?? {};

  return (
    <div className="hidden md:block bg-primary-900 text-primary-100 text-sm">
      <div className="container-main flex items-center justify-between h-10">
        {/* Left: contact info */}
        <div className="flex items-center gap-5">
          {general.site_phone && (
            <a
              href={`tel:${general.site_phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>{general.site_phone}</span>
            </a>
          )}
          {general.site_email && (
            <a
              href={`mailto:${general.site_email}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>{general.site_email}</span>
            </a>
          )}
          {general.working_hours && (
            <span className="flex items-center gap-1.5 text-primary-200">
              <Clock className="h-4 w-4" />
              <span>{general.working_hours}</span>
            </span>
          )}
        </div>

        {/* Right: nav links + social */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3">
            <Link href="/hakkimizda" className="hover:text-white transition-colors">
              Hakkımızda
            </Link>
            <Link href="/iletisim" className="hover:text-white transition-colors">
              İletişim
            </Link>
          </nav>
          {(social.instagram_url || social.facebook_url || social.twitter_url || social.youtube_url) && (
            <>
              <span className="text-primary-600">|</span>
              <div className="flex items-center gap-2">
                {social.instagram_url && (
                  <a href={social.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {social.facebook_url && (
                  <a href={social.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {social.twitter_url && (
                  <a href={social.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Twitter">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {social.youtube_url && (
                  <a href={social.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="YouTube">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
