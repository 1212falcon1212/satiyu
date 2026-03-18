'use client';

import { createContext, useContext } from 'react';
import type { SiteSettings } from '@/types/api';

const SettingsContext = createContext<SiteSettings>({});

export function SettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SiteSettings {
  return useContext(SettingsContext);
}
