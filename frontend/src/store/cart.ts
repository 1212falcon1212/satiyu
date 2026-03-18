import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { getSessionId } from '@/lib/session';

interface CartItem {
  id: string;
  productId: number;
  variantId?: number;
  name: string;
  price: number;
  comparePrice?: number;
  quantity: number;
  image?: string;
  sku?: string;
  variantInfo?: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  syncing: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  syncWithServer: () => Promise<void>;
}

function sessionHeaders() {
  return { 'X-Session-Id': getSessionId() };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      syncing: false,

      addItem: (item) => {
        const id = `${item.productId}-${item.variantId || 0}`;
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, id }] };
        });

        // Server sync
        api.post('/cart', {
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
        }, { headers: sessionHeaders() }).catch(() => {});
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));

        api.delete(`/cart/${id}`, { headers: sessionHeaders() }).catch(() => {});
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.id !== id)
            : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }));

        if (quantity > 0) {
          api.put(`/cart/${id}`, { quantity }, { headers: sessionHeaders() }).catch(() => {});
        } else {
          api.delete(`/cart/${id}`, { headers: sessionHeaders() }).catch(() => {});
        }
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      syncWithServer: async () => {
        set({ syncing: true });
        try {
          const { data: json } = await api.get('/cart', { headers: sessionHeaders() });
          const serverItems = json.data?.items || [];

          const items: CartItem[] = serverItems.map((si: {
            id: string;
            productId: number;
            variantId: number | null;
            productName: string;
            imageUrl: string | null;
            price: number;
            comparePrice: number | null;
            quantity: number;
            variantInfo: { type: string; value: string }[];
          }) => ({
            id: si.id,
            productId: si.productId,
            variantId: si.variantId ?? undefined,
            name: si.productName,
            price: si.price,
            comparePrice: si.comparePrice ?? undefined,
            quantity: si.quantity,
            image: si.imageUrl ?? undefined,
            variantInfo: si.variantInfo?.reduce(
              (acc: Record<string, string>, v: { type: string; value: string }) => {
                acc[v.type] = v.value;
                return acc;
              },
              {} as Record<string, string>
            ),
          }));

          set({ items });
        } catch {
          // Keep local cart on failure
        } finally {
          set({ syncing: false });
        }
      },
    }),
    { name: 'cart-storage' }
  )
);
