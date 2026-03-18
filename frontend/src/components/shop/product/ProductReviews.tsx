'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import api from '@/lib/api';
import { useCustomerAuthStore } from '@/store/customer-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Review, ReviewStats } from '@/types/api';

interface ProductReviewsProps {
  productSlug: string;
}

function StarRating({
  rating,
  onRate,
  size = 'md',
}: {
  rating: number;
  onRate?: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onRate?.(n)}
          disabled={!onRate}
          className={onRate ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sizeClass} ${
              n <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-secondary-200 text-secondary-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productSlug, onSuccess }: { productSlug: string; onSuccess: () => void }) {
  const { token } = useCustomerAuthStore();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/products/${productSlug}/reviews`,
        { rating, title: title || null, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Yorumunuz gönderildi. Onaylandıktan sonra görüntülenecektir.');
      setRating(0);
      setTitle('');
      setComment('');
      onSuccess();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 409) {
        toast.error('Bu ürün için zaten bir yorumunuz var.');
      } else {
        toast.error(axiosError.response?.data?.message || 'Yorum gönderilemedi.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Lütfen bir puan seçin.');
      return;
    }
    if (comment.length < 10) {
      toast.error('Yorum en az 10 karakter olmalıdır.');
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-secondary-200 bg-white p-6">
      <h3 className="font-display text-lg font-semibold text-secondary-900">Yorum Yaz</h3>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-secondary-700">Puanınız</label>
        <StarRating rating={rating} onRate={setRating} />
      </div>
      <Input
        label="Başlık (İsteğe bağlı)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        label="Yorumunuz"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        required
      />
      <Button type="submit" variant="accent" loading={mutation.isPending}>
        {mutation.isPending ? 'Gönderiliyor...' : 'Yorum Gönder'}
      </Button>
    </form>
  );
}

export function ProductReviews({ productSlug }: ProductReviewsProps) {
  const queryClient = useQueryClient();
  const { customer } = useCustomerAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productSlug],
    queryFn: async () => {
      const { data: res } = await api.get(`/products/${productSlug}/reviews`);
      return res as {
        data: { data: Review[] };
        stats: ReviewStats;
      };
    },
  });

  const reviews = data?.data?.data ?? [];
  const stats = data?.stats ?? { average: 0, count: 0 };

  return (
    <div>
      {stats.count > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <StarRating rating={Math.round(stats.average)} size="sm" />
          <span className="text-sm text-secondary-500">
            {stats.average} ortalama ({stats.count} yorum)
          </span>
        </div>
      )}

      {/* Review Form */}
      {customer ? (
        <div className="mb-8">
          <ReviewForm
            productSlug={productSlug}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['reviews', productSlug] })}
          />
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
          <p className="text-sm text-secondary-600">
            Yorum yapabilmek için{' '}
            <a href="/giris" className="font-medium text-accent-600 hover:underline">
              giriş yapın
            </a>{' '}
            veya{' '}
            <a href="/kayit" className="font-medium text-accent-600 hover:underline">
              kayıt olun
            </a>
            .
          </p>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-secondary-200 bg-white p-5 animate-pulse">
              <div className="h-4 w-24 rounded bg-secondary-200" />
              <div className="mt-3 h-3 w-full rounded bg-secondary-200" />
              <div className="mt-2 h-3 w-3/4 rounded bg-secondary-200" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-secondary-500 text-center py-8">
          Henüz değerlendirme yapılmamış. İlk değerlendirmeyi siz yapın!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-secondary-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {review.customer?.name.charAt(0).toUpperCase() || 'K'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">
                      {review.customer?.name || 'Anonim'}
                    </p>
                    <p className="text-xs text-secondary-400">
                      {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.title && (
                <h4 className="mt-3 text-sm font-semibold text-secondary-800">{review.title}</h4>
              )}
              <p className="mt-2 text-sm text-secondary-600 leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
