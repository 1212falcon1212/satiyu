'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Trash2, ShoppingBag } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';

interface SavedCard {
  ctoken: string;
  last_4: string;
  require_cvv: number;
  month: string;
  year: string;
  c_bank: string;
  c_name: string;
  c_brand: string;
  c_type: string;
  schema: string;
}

export default function MyCardsPage() {
  const { customer, token } = useCustomerAuthStore();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SavedCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!customer || !token) return;

    const fetchCards = async () => {
      try {
        const { data } = await api.get('/customer/paytr/cards', { headers: authHeaders });
        setCards(data.cards || []);
      } catch {
        // Keep empty on failure
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, token]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post('/customer/paytr/cards/delete', { ctoken: deleteTarget.ctoken }, { headers: authHeaders });
      setCards((prev) => prev.filter((c) => c.ctoken !== deleteTarget.ctoken));
      toast.success('Kart silindi.');
    } catch {
      toast.error('Kart silinirken bir hata oluştu.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getSchemaLabel = (schema: string) => {
    const s = schema?.toLowerCase() || '';
    if (s.includes('visa')) return 'VISA';
    if (s.includes('master')) return 'MC';
    if (s.includes('troy')) return 'TROY';
    if (s.includes('amex')) return 'AMEX';
    return schema?.toUpperCase() || '';
  };

  if (!customer) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">Kartlarım</h1>
      <p className="mt-1 text-sm text-secondary-500">PayTR tarafında güvenle saklanan kayıtlı kartlarınız.</p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-200 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <CreditCard className="h-8 w-8 text-primary-300" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-secondary-900">
              Henüz kayıtlı kartınız yok
            </h2>
            <p className="mt-1 text-sm text-secondary-500">
              Ödeme sırasında &quot;Kartımı kaydet&quot; seçeneğini kullanarak kartınızı kaydedebilirsiniz.
            </p>
            <Link
              href="/tum-urunler"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.ctoken}
                className="flex items-center justify-between rounded-xl border border-secondary-200 bg-white p-4 transition-colors hover:border-secondary-300"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-50">
                    <CreditCard className="h-6 w-6 text-secondary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-bold text-secondary-700">
                        {getSchemaLabel(card.schema)}
                      </span>
                      <span className="font-mono text-sm font-semibold text-secondary-900">
                        **** **** **** {card.last_4}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-secondary-500">
                      <span>{card.c_bank}</span>
                      <span className="text-secondary-300">|</span>
                      <span>{card.c_name}</span>
                      <span className="text-secondary-300">|</span>
                      <span>Son Kullanma: {card.month}/{card.year}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(card)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary-400 transition-colors hover:bg-danger/5 hover:text-danger"
                  title="Kartı Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kartı Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary-600">
            <span className="font-mono font-semibold">**** {deleteTarget?.last_4}</span> numaralı kartınızı silmek istediğinize emin misiniz?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
