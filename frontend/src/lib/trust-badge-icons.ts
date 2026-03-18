import {
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  Headphones,
  Award,
  MessageCircle,
  Zap,
  Phone,
  Lock,
  BadgeCheck,
  Heart,
  type LucideIcon,
} from 'lucide-react';

export const trustBadgeIconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  Headphones,
  Award,
  MessageCircle,
  Zap,
  Phone,
  Lock,
  BadgeCheck,
  Heart,
};

export const trustBadgeIconOptions = Object.keys(trustBadgeIconMap).map((key) => ({
  value: key,
  label: key,
}));
