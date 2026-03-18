'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { revalidateCache } from '@/lib/revalidate';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import type { SiteSettings } from '@/types/api';

// ─── Settings Map: flat form key → { group, key } ──────────────
const SETTINGS_MAP: Record<string, { group: string; key: string }> = {
  // General
  site_name: { group: 'general', key: 'site_name' },
  site_url: { group: 'general', key: 'site_url' },
  site_description: { group: 'general', key: 'site_description' },
  working_hours: { group: 'general', key: 'working_hours' },
  refund_days: { group: 'general', key: 'refund_days' },
  site_logo: { group: 'general', key: 'site_logo' },
  site_favicon: { group: 'general', key: 'site_favicon' },
  footer_background_image: { group: 'general', key: 'footer_background_image' },
  footer_background_color: { group: 'general', key: 'footer_background_color' },
  hero_background_image: { group: 'general', key: 'hero_background_image' },
  // Contact (general group in DB)
  site_email: { group: 'general', key: 'site_email' },
  site_phone: { group: 'general', key: 'site_phone' },
  whatsapp: { group: 'general', key: 'whatsapp' },
  address: { group: 'general', key: 'address' },
  // Shipping
  free_shipping_limit: { group: 'shipping', key: 'free_shipping_limit' },
  default_shipping_cost: { group: 'shipping', key: 'default_shipping_cost' },
  // Payment
  credit_card_enabled: { group: 'payment', key: 'credit_card_enabled' },
  bank_transfer_enabled: { group: 'payment', key: 'bank_transfer_enabled' },
  cash_on_delivery_enabled: { group: 'payment', key: 'cash_on_delivery_enabled' },
  havale_discount_rate: { group: 'payment', key: 'havale_discount_rate' },
  havale_iban: { group: 'payment', key: 'havale_iban' },
  havale_account_name: { group: 'payment', key: 'havale_account_name' },
  havale_description: { group: 'payment', key: 'havale_description' },
  paytr_merchant_id: { group: 'payment', key: 'paytr_merchant_id' },
  paytr_merchant_key: { group: 'payment', key: 'paytr_merchant_key' },
  paytr_merchant_salt: { group: 'payment', key: 'paytr_merchant_salt' },
  paytr_test_mode: { group: 'payment', key: 'paytr_test_mode' },
  // SEO
  meta_title: { group: 'seo', key: 'meta_title' },
  meta_description: { group: 'seo', key: 'meta_description' },
  // Announcement
  announcement_enabled: { group: 'general', key: 'announcement_enabled' },
  announcement_text: { group: 'general', key: 'announcement_text' },
  announcement_link: { group: 'general', key: 'announcement_link' },
  announcement_bg_color: { group: 'general', key: 'announcement_bg_color' },
  // Social
  instagram_url: { group: 'social', key: 'instagram_url' },
  facebook_url: { group: 'social', key: 'facebook_url' },
  twitter_url: { group: 'social', key: 'twitter_url' },
  youtube_url: { group: 'social', key: 'youtube_url' },
};

type FlatSettings = Record<string, string>;

/** Convert grouped API response → flat form state */
function flattenSettings(grouped: SiteSettings): FlatSettings {
  const flat: FlatSettings = {};
  for (const [formKey, { group, key }] of Object.entries(SETTINGS_MAP)) {
    flat[formKey] = grouped[group as keyof SiteSettings]?.[key] ?? '';
  }
  return flat;
}

/** Convert flat form state → API payload */
function toApiPayload(flat: FlatSettings) {
  const settings = Object.entries(SETTINGS_MAP).map(([formKey, { group, key }]) => ({
    key,
    value: flat[formKey] ?? '',
    group,
  }));
  return { settings };
}

function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

function validateIban(value: string): string | null {
  const clean = value.replace(/\s/g, '').toUpperCase();
  if (!clean) return null;
  if (!/^TR\d{24}$/.test(clean)) return 'IBAN "TR" ile başlamalı ve 26 karakter olmalıdır.';
  return null;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FlatSettings>({});
  const [ibanError, setIbanError] = useState<string | null>(null);

  const handleIbanChange = useCallback((value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '').toUpperCase();
    if (clean.length > 26) return;
    const formatted = formatIban(clean);
    setForm((prev) => ({ ...prev, havale_iban: formatted }));
    setIbanError(validateIban(clean));
  }, []);

  const { data, isLoading } = useQuery<SiteSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/settings');
      return data.data ?? data;
    },
  });

  useEffect(() => {
    if (data) {
      const flat = flattenSettings(data);
      if (flat.havale_iban) {
        flat.havale_iban = formatIban(flat.havale_iban);
      }
      setForm(flat);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof toApiPayload>) => {
      const { data } = await api.put('/admin/settings', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Ayarlar kaydedildi.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      revalidateCache(['settings']);
    },
    onError: () => toast.error('Ayarlar kaydedilemedi.'),
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ibanError) {
      toast.error('Lütfen geçerli bir IBAN giriniz.');
      return;
    }
    // Store IBAN without spaces
    const cleanForm = { ...form };
    if (cleanForm.havale_iban) {
      cleanForm.havale_iban = cleanForm.havale_iban.replace(/\s/g, '');
    }
    mutation.mutate(toApiPayload(cleanForm));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-secondary-900">Ayarlar</h1>
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      {/* Announcement Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Site Mesajı (Üst Şerit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch
            checked={form.announcement_enabled === 'true'}
            onCheckedChange={(c) => update('announcement_enabled', String(c))}
            label="Site mesajını göster"
          />
          {form.announcement_enabled === 'true' && (
            <>
              <Input
                label="Mesaj Metni"
                value={form.announcement_text ?? ''}
                onChange={(e) => update('announcement_text', e.target.value)}
                placeholder="Örn: Tüm ürünlerde %20 indirim! Kod: MODA20"
              />
              <Input
                label="Link (Opsiyonel)"
                value={form.announcement_link ?? ''}
                onChange={(e) => update('announcement_link', e.target.value)}
                placeholder="/tum-urunler"
                hint="Mesaja tıklanınca gidilecek sayfa. Boş bırakılırsa tıklanamaz."
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary-700">Arka Plan Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.announcement_bg_color || '#E53E3E'}
                    onChange={(e) => update('announcement_bg_color', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-secondary-300"
                  />
                  <Input
                    value={form.announcement_bg_color || '#E53E3E'}
                    onChange={(e) => update('announcement_bg_color', e.target.value)}
                    placeholder="#E53E3E"
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>Genel Ayarlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Site Adı" value={form.site_name ?? ''} onChange={(e) => update('site_name', e.target.value)} />
          <Input label="Site URL" value={form.site_url ?? ''} onChange={(e) => update('site_url', e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Site Açıklaması" value={form.site_description ?? ''} onChange={(e) => update('site_description', e.target.value)} />
          </div>
          <Input label="Çalışma Saatleri" value={form.working_hours ?? ''} onChange={(e) => update('working_hours', e.target.value)} />
          <Input label="İade Süresi (Gün)" type="number" min="1" value={form.refund_days || '14'} onChange={(e) => update('refund_days', e.target.value)} placeholder="14" />
        </CardContent>
      </Card>

      {/* Logo & Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Logo & Favicon</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <ImageUpload
            label="Site Logosu"
            value={form.site_logo ?? ''}
            onChange={(url) => update('site_logo', url)}
            folder="settings"
            hint="Önerilen boyut: 200x60px"
          />
          <ImageUpload
            label="Favicon"
            value={form.site_favicon ?? ''}
            onChange={(url) => update('site_favicon', url)}
            folder="settings"
            hint="Önerilen boyut: 32x32px veya 64x64px"
          />
          <div className="sm:col-span-2">
            <ImageUpload
              label="Banner Alanı Arka Plan Görseli"
              value={form.hero_background_image ?? ''}
              onChange={(url) => update('hero_background_image', url)}
              folder="settings"
              hint="Ana sayfa banner alanının arkasında saydam gösterilecek görsel. Boş bırakılırsa varsayılan görsel kullanılır."
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload
              label="Footer Arka Plan Görseli"
              value={form.footer_background_image ?? ''}
              onChange={(url) => update('footer_background_image', url)}
              folder="settings"
              hint="Footer arka planında saydam gösterilecek görsel. Boş bırakılırsa sadece renk kullanılır."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-700">
              Footer Arka Plan Rengi
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.footer_background_color || '#1e293b'}
                onChange={(e) => update('footer_background_color', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-secondary-300"
              />
              <Input
                value={form.footer_background_color || '#1e293b'}
                onChange={(e) => update('footer_background_color', e.target.value)}
                placeholder="#1e293b"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-secondary-500">
              Görsel yoksa bu renk kullanılır. Görsel varsa overlay rengi olarak kullanılır.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>İletişim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="E-posta" type="email" value={form.site_email ?? ''} onChange={(e) => update('site_email', e.target.value)} />
          <Input label="Telefon" value={form.site_phone ?? ''} onChange={(e) => update('site_phone', e.target.value)} />
          <Input label="WhatsApp" value={form.whatsapp ?? ''} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+905xxxxxxxxx" />
          <div className="sm:col-span-2">
            <Textarea label="Adres" value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <CardTitle>Kargo Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Ücretsiz Kargo Limiti (TL)" type="number" value={form.free_shipping_limit ?? ''} onChange={(e) => update('free_shipping_limit', e.target.value)} />
          <Input label="Varsayılan Kargo Ücreti (TL)" type="number" value={form.default_shipping_cost ?? ''} onChange={(e) => update('default_shipping_cost', e.target.value)} />
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Yöntemleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch
            checked={form.credit_card_enabled === 'true'}
            onCheckedChange={(c) => update('credit_card_enabled', String(c))}
            label="Kredi Kartı"
          />
          {form.credit_card_enabled === 'true' && (
            <div className="ml-8 space-y-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <p className="text-sm font-semibold text-secondary-700">PayTR Ayarları</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Merchant ID"
                  value={form.paytr_merchant_id ?? ''}
                  onChange={(e) => update('paytr_merchant_id', e.target.value)}
                  placeholder="PayTR Merchant ID"
                />
                <Input
                  label="Merchant Key"
                  type="password"
                  value={form.paytr_merchant_key ?? ''}
                  onChange={(e) => update('paytr_merchant_key', e.target.value)}
                  placeholder="PayTR Merchant Key"
                />
              </div>
              <Input
                label="Merchant Salt"
                type="password"
                value={form.paytr_merchant_salt ?? ''}
                onChange={(e) => update('paytr_merchant_salt', e.target.value)}
                placeholder="PayTR Merchant Salt"
              />
              <Switch
                checked={form.paytr_test_mode === 'true'}
                onCheckedChange={(c) => update('paytr_test_mode', String(c))}
                label="Test Modu"
              />
            </div>
          )}
          <Switch
            checked={form.bank_transfer_enabled === 'true'}
            onCheckedChange={(c) => update('bank_transfer_enabled', String(c))}
            label="Banka Havale/EFT"
          />
          {form.bank_transfer_enabled === 'true' && (
            <div className="ml-8 space-y-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <p className="text-sm font-semibold text-secondary-700">Havale/EFT Ayarları</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Havale İndirimi (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={form.havale_discount_rate ?? ''}
                  onChange={(e) => update('havale_discount_rate', e.target.value)}
                  placeholder="5"
                />
                <Input
                  label="Hesap Sahibi (Ad Soyad)"
                  value={form.havale_account_name ?? ''}
                  onChange={(e) => update('havale_account_name', e.target.value)}
                  placeholder="Örnek: Ali Yıldız"
                />
              </div>
              <div>
                <Input
                  label="IBAN Numarası"
                  value={form.havale_iban ?? ''}
                  onChange={(e) => handleIbanChange(e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className={ibanError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {ibanError && (
                  <p className="mt-1 text-xs text-red-500">{ibanError}</p>
                )}
                {!ibanError && form.havale_iban && form.havale_iban.replace(/\s/g, '').length === 26 && (
                  <p className="mt-1 text-xs text-emerald-600">Geçerli IBAN</p>
                )}
              </div>
              <Textarea
                label="Havale Açıklaması (Opsiyonel)"
                value={form.havale_description ?? ''}
                onChange={(e) => update('havale_description', e.target.value)}
                rows={2}
                placeholder="Örnek: Açıklamaya sipariş kodunuzu yazınız."
              />
            </div>
          )}
          <Switch
            checked={form.cash_on_delivery_enabled === 'true'}
            onCheckedChange={(c) => update('cash_on_delivery_enabled', String(c))}
            label="Kapıda Ödeme"
          />
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Varsayılan Meta Title" value={form.meta_title ?? ''} onChange={(e) => update('meta_title', e.target.value)} />
          <Textarea label="Varsayılan Meta Description" value={form.meta_description ?? ''} onChange={(e) => update('meta_description', e.target.value)} rows={3} />
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle>Sosyal Medya</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Instagram URL" value={form.instagram_url ?? ''} onChange={(e) => update('instagram_url', e.target.value)} />
          <Input label="Facebook URL" value={form.facebook_url ?? ''} onChange={(e) => update('facebook_url', e.target.value)} />
          <Input label="Twitter/X URL" value={form.twitter_url ?? ''} onChange={(e) => update('twitter_url', e.target.value)} />
          <Input label="YouTube URL" value={form.youtube_url ?? ''} onChange={(e) => update('youtube_url', e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </Button>
      </div>
    </form>
  );
}
