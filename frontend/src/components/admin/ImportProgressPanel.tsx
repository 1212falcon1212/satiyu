'use client';

import { Badge } from '@/components/ui/badge';
import type { ImportProgress, ImportStatus } from '@/hooks/useImportProgress';

interface ImportProgressPanelProps {
  progress: ImportProgress;
  isActive: boolean;
}

const STATUS_CONFIG: Record<
  ImportStatus,
  { label: string; variant: 'outline' | 'info' | 'warning' | 'default' | 'success' | 'danger' }
> = {
  idle: { label: 'Bekliyor', variant: 'outline' },
  queued: { label: 'Kuyrukta', variant: 'warning' },
  downloading: { label: 'Indiriliyor', variant: 'info' },
  parsing: { label: 'Ayristiriliyor', variant: 'info' },
  processing: { label: 'Isleniyor', variant: 'default' },
  completed: { label: 'Tamamlandi', variant: 'success' },
  failed: { label: 'Hata', variant: 'danger' },
};

export default function ImportProgressPanel({ progress, isActive }: ImportProgressPanelProps) {
  const { status } = progress;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  if (status === 'idle') {
    return (
      <div className="rounded-lg border border-secondary-200 bg-white p-5">
        <p className="text-sm text-secondary-500">Aktif import işlemi yok.</p>
      </div>
    );
  }

  const total = progress.total ?? 0;
  const processed = progress.processed ?? 0;
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const created = progress.created ?? 0;
  const updated = progress.updated ?? 0;
  const failed = progress.failed ?? 0;

  return (
    <div
      className={`rounded-lg border bg-white p-5 transition-colors ${
        isActive ? 'border-blue-300 shadow-sm shadow-blue-100' : 'border-secondary-200'
      }`}
    >
      {/* Header: status badge + pulse */}
      <div className="flex items-center gap-3 mb-4">
        {isActive && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>
        )}
        <Badge variant={config.variant}>{config.label}</Badge>
        {total > 0 && (
          <span className="text-sm text-secondary-500">
            {processed} / {total} ürün
          </span>
        )}
      </div>

      {/* Progress bar */}
      {status === 'processing' || status === 'completed' || status === 'failed' ? (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary-500">Ilerleme</span>
            <span className="text-xs font-medium text-secondary-700">{percent}%</span>
          </div>
          <div className="w-full bg-secondary-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                status === 'failed'
                  ? 'bg-red-500'
                  : status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Stats */}
      {(status === 'processing' || status === 'completed' || status === 'failed') && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-emerald-50 p-3 text-center">
            <div className="text-lg font-semibold text-emerald-700">{created}</div>
            <div className="text-xs text-emerald-600">Yeni</div>
          </div>
          <div className="rounded-md bg-blue-50 p-3 text-center">
            <div className="text-lg font-semibold text-blue-700">{updated}</div>
            <div className="text-xs text-blue-600">Güncellenen</div>
          </div>
          <div className="rounded-md bg-red-50 p-3 text-center">
            <div className="text-lg font-semibold text-red-700">{failed}</div>
            <div className="text-xs text-red-600">Başarısız</div>
          </div>
        </div>
      )}

      {/* Error message */}
      {status === 'failed' && progress.error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{progress.error}</p>
        </div>
      )}
    </div>
  );
}
