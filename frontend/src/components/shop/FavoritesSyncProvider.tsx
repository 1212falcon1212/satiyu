'use client';

import { useEffect, useRef } from 'react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { useFavoritesStore } from '@/store/favorites';

export function FavoritesSyncProvider() {
  const customer = useCustomerAuthStore((s) => s.customer);
  const token = useCustomerAuthStore((s) => s.token);
  const syncWithServer = useFavoritesStore((s) => s.syncWithServer);
  const clear = useFavoritesStore((s) => s.clear);
  const prevTokenRef = useRef(token);

  useEffect(() => {
    const prevToken = prevTokenRef.current;
    prevTokenRef.current = token;

    if (token && customer) {
      // Logged in (or token changed) — sync from server
      syncWithServer();
    } else if (prevToken && !token) {
      // Logged out — clear favorites
      clear();
    }
  }, [token, customer, syncWithServer, clear]);

  return null;
}
