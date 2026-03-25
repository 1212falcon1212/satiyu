'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = 'banners',
  label,
  hint,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Sadece görsel dosyaları yüklenebilir.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const { data } = await api.post('/admin/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(data.url);
      } catch {
        setError('Yükleme başarısız oldu. Tekrar deneyin.');
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  const hasPreview = value && value.length > 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700">
          {label}
        </label>
      )}

      {hasPreview ? (
        /* Preview state */
        <div className="group relative overflow-hidden rounded-xl border border-secondary-200 bg-secondary-50">
          <div className="relative aspect-[16/7]">
            <Image
              src={value.startsWith('http') ? value : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')}${value}`}
              alt="Görsel önizleme"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
              unoptimized
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-900 shadow-lg transition-transform hover:scale-105"
              >
                <Upload className="h-4 w-4" />
                Değiştir
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
              >
                <X className="h-4 w-4" />
                Kaldır
              </button>
            </div>
          </div>
          {/* URL display */}
          <div className="border-t border-secondary-200 bg-white px-3 py-2">
            <p className="truncate text-xs text-secondary-400">{value}</p>
          </div>
        </div>
      ) : (
        /* Upload / drop zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all',
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : 'border-secondary-300 bg-secondary-50 hover:border-primary-400 hover:bg-primary-50/50',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
              <p className="mt-3 text-sm font-medium text-secondary-600">
                Yükleniyor...
              </p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <ImageIcon className="h-7 w-7 text-primary-600" />
              </div>
              <p className="mt-3 text-sm font-medium text-secondary-700">
                Görsel yüklemek için tıklayın veya sürükleyin
              </p>
              <p className="mt-1 text-xs text-secondary-400">
                PNG, JPG, WEBP, SVG — Maks. 5MB
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {hint && !error && (
        <p className="text-xs text-secondary-400">{hint}</p>
      )}

      {/* Hidden URL input for manual entry */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="veya görsel URL'si yapıştırın..."
          className="flex-1 rounded-lg border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-600 placeholder:text-secondary-300 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
