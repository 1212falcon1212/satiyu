import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { useCustomerAuthStore } from '@/store/customer-auth';

interface FavoritesState {
  ids: number[];
  loading: boolean;
  toggle: (productId: number) => void;
  isFavorited: (productId: number) => boolean;
  syncWithServer: () => Promise<void>;
  clear: () => void;
  count: () => number;
}

function authHeaders() {
  const token = useCustomerAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      loading: false,

      toggle: (productId: number) => {
        const current = get().ids;
        const exists = current.includes(productId);

        // Optimistic update
        if (exists) {
          set({ ids: current.filter((id) => id !== productId) });
        } else {
          set({ ids: [...current, productId] });
        }

        // Server sync
        api
          .post('/customer/favorites', { product_id: productId }, { headers: authHeaders() })
          .catch(() => {
            // Revert on failure
            if (exists) {
              set({ ids: [...get().ids, productId] });
            } else {
              set({ ids: get().ids.filter((id) => id !== productId) });
            }
          });
      },

      isFavorited: (productId: number) => get().ids.includes(productId),

      syncWithServer: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get('/customer/favorites/check', {
            headers: authHeaders(),
          });
          set({ ids: data.data ?? [] });
        } catch {
          // Keep local state on failure
        } finally {
          set({ loading: false });
        }
      },

      clear: () => set({ ids: [] }),

      count: () => get().ids.length,
    }),
    {
      name: 'favorites-storage',
      partialize: (state) => ({ ids: state.ids }),
    }
  )
);
