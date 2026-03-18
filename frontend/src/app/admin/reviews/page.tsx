'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import { Check, X, Trash2, Star } from 'lucide-react';

interface Review {
  id: number;
  productId: number;
  customerId: number;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  customer?: { id: number; name: string };
  product?: { id: number; name: string };
  [key: string]: unknown;
}

const MOCK_REVIEWS: Review[] = [
  { id: 1, productId: 1, customerId: 1, rating: 5, title: 'Mükemmel çadır', comment: 'Çok hafif ve kurulumu kolay. Kesinlikle tavsiye ederim.', isApproved: true, createdAt: '2024-03-15T10:30:00Z', customer: { id: 1, name: 'Ahmet Yılmaz' }, product: { id: 1, name: 'Cloud Up 2 Çadır' } },
  { id: 2, productId: 2, customerId: 2, rating: 4, title: 'İyi ürün', comment: 'Fiyat performans olarak gayet başarılı bir uyku tulumu.', isApproved: true, createdAt: '2024-03-14T14:20:00Z', customer: { id: 2, name: 'Ayşe Demir' }, product: { id: 2, name: 'Orbit -5 Uyku Tulumu' } },
  { id: 3, productId: 3, customerId: 3, rating: 3, title: null, comment: 'Çanta güzel ama fermuar biraz zor kapanıyor. Diğer özellikleri iyi.', isApproved: false, createdAt: '2024-03-13T09:15:00Z', customer: { id: 3, name: 'Mehmet Kaya' }, product: { id: 3, name: 'Atmos AG 65L' } },
  { id: 4, productId: 4, customerId: 4, rating: 5, title: 'Harika!', comment: 'Çok hızlı kaynatıyor. Kamp için ideal bir ocak.', isApproved: false, createdAt: '2024-03-12T16:45:00Z', customer: { id: 4, name: 'Fatma Öztürk' }, product: { id: 4, name: 'PocketRocket 2' } },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-secondary-200 text-secondary-200'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Review[]>({
    queryKey: ['admin', 'reviews'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reviews');
      return data.data ?? data;
    },
  });

  const reviews = (data && data.length > 0) ? data : MOCK_REVIEWS;

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/reviews/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Yorum onaylandı.');
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/reviews/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Yorum reddedildi.');
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Yorum silindi.');
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const columns: Column<Review>[] = [
    {
      key: 'customer',
      header: 'Müşteri',
      render: (r) => <span className="text-sm font-medium">{r.customer?.name ?? '-'}</span>,
    },
    {
      key: 'product',
      header: 'Ürün',
      render: (r) => <span className="text-sm">{r.product?.name ?? '-'}</span>,
    },
    {
      key: 'rating',
      header: 'Puan',
      render: (r) => <StarDisplay rating={r.rating} />,
    },
    {
      key: 'comment',
      header: 'Yorum',
      render: (r) => (
        <div className="max-w-xs">
          {r.title && <p className="text-sm font-medium text-secondary-800">{r.title}</p>}
          <p className="text-xs text-secondary-500 line-clamp-2">{r.comment}</p>
        </div>
      ),
    },
    {
      key: 'isApproved',
      header: 'Durum',
      render: (r) => (
        <Badge variant={r.isApproved ? 'success' : 'warning'}>
          {r.isApproved ? 'Onaylı' : 'Bekliyor'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          {!r.isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveMutation.mutate(r.id)}
              loading={approveMutation.isPending}
              title="Onayla"
            >
              <Check className="h-3.5 w-3.5 text-success" />
            </Button>
          )}
          {r.isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => rejectMutation.mutate(r.id)}
              loading={rejectMutation.isPending}
              title="Reddet"
            >
              <X className="h-3.5 w-3.5 text-warning" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteMutation.mutate(r.id)}
            loading={deleteMutation.isPending}
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) return <Alert variant="error">Yorumlar yüklenirken hata oluştu.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Yorumlar</h1>
      </div>

      <DataTable
        columns={columns}
        data={reviews}
        isLoading={isLoading}
        emptyMessage="Henüz yorum yok."
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
