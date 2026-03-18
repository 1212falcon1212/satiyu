import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex items-start gap-3 rounded-lg border p-4',
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        error: 'border-danger/20 bg-danger/5 text-danger',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

function Alert({ variant = 'info', title, children, className, icon }: AlertProps) {
  const IconComponent = iconMap[variant ?? 'info'];

  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert">
      <div className="shrink-0 pt-0.5">
        {icon || <IconComponent className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        {title && <p className="mb-1 font-medium">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export { Alert, alertVariants };
