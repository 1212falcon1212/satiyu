'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useCustomerAuthStore } from '@/store/customer-auth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Address } from '@/types/api';

const emptyForm = {
  title: '', full_name: '', phone: '', city: '', district: '',
  neighborhood: '', address_line: '', postal_code: '', is_default: false,
};

export default function AddressesPage() {
  const { customer, token } = useCustomerAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/customer/addresses', { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (customer && token) fetchAddresses();
  }, [customer, token, fetchAddresses]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    setForm({
      title: addr.title,
      full_name: addr.full_name,
      phone: addr.phone,
      city: addr.city,
      district: addr.district,
      neighborhood: addr.neighborhood || '',
      address_line: addr.address_line,
      postal_code: addr.postal_code || '',
      is_default: addr.is_default,
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/customer/addresses/${editingId}`, form, { headers: authHeaders });
        setAddresses((prev) => prev.map((a) => (a.id === editingId ? data.data : a)));
        toast.success('Adres güncellendi.');
      } else {
        const { data } = await api.post('/customer/addresses', form, { headers: authHeaders });
        setAddresses((prev) => [...prev, data.data]);
        toast.success('Adres eklendi.');
      }
      setShowDialog(false);
      fetchAddresses();
    } catch {
      toast.error('Adres kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/customer/addresses/${id}`, { headers: authHeaders });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Adres silindi.');
    } catch {
      toast.error('Adres silinemedi.');
    }
  };

  if (!customer) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-secondary-900 sm:text-2xl">Adreslerim</h1>
          <p className="mt-1 text-sm text-secondary-500">Teslimat adreslerinizi yönetin.</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" />
          Yeni Adres
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary-100" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-200 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-50">
              <MapPin className="h-8 w-8 text-secondary-300" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-secondary-900">Henüz adresiniz yok</h2>
            <p className="mt-1 text-sm text-secondary-500">Sipariş vermek için bir adres ekleyin.</p>
            <Button onClick={openAdd} className="mt-5" size="sm">
              <Plus className="h-4 w-4" />
              Adres Ekle
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-secondary-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-secondary-900">{addr.title}</h3>
                    {addr.is_default && (
                      <Badge variant="info">
                        <Star className="mr-1 h-3 w-3" />
                        Varsayılan
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      className="rounded p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="rounded p-1.5 text-secondary-400 hover:bg-danger/10 hover:text-danger transition-colors"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-secondary-700">
                  {addr.full_name} - {addr.phone}
                </p>
                <p className="mt-1 text-sm text-secondary-500">
                  {addr.address_line}
                  {addr.neighborhood && `, ${addr.neighborhood}`}
                  , {addr.district}/{addr.city}
                  {addr.postal_code && ` - ${addr.postal_code}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog isOpen={showDialog} onClose={() => setShowDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <Input
              label="Adres Başlığı"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
              placeholder="Ev, İş, vb."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad Soyad"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                required
              />
              <Input
                label="Telefon"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="İl"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                required
              />
              <Input
                label="İlçe"
                value={form.district}
                onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                required
              />
            </div>
            <Input
              label="Mahalle"
              value={form.neighborhood}
              onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
            />
            <Textarea
              label="Adres Satırı"
              value={form.address_line}
              onChange={(e) => setForm((p) => ({ ...p, address_line: e.target.value }))}
              required
              textareaSize="sm"
            />
            <Input
              label="Posta Kodu"
              value={form.postal_code}
              onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-secondary-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                className="h-4 w-4 rounded text-primary-600"
              />
              Varsayılan adres olarak ayarla
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? 'Güncelle' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
