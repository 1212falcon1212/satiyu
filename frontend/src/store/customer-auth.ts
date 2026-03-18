import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import type { Customer } from '@/types/api';

interface CustomerAuthState {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({
            customer: data.data.customer,
            token: data.data.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string, phone?: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', {
            name,
            email,
            password,
            password_confirmation: password,
            phone: phone || null,
          });
          set({
            customer: data.data.customer,
            token: data.data.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const token = get().token;
        if (token) {
          api.post('/customer/auth/logout', null, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
        set({ customer: null, token: null });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const { data } = await api.get('/customer/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ customer: data.data });
        } catch {
          set({ customer: null, token: null });
        }
      },
    }),
    {
      name: 'customer-auth-storage',
      partialize: (state) => ({ token: state.token, customer: state.customer }),
    }
  )
);
