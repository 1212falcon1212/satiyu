import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-main flex flex-col items-center justify-center py-20 text-center">
      <div className="text-8xl font-bold text-secondary-200">404</div>
      <h1 className="mt-4 text-2xl font-bold text-secondary-900">Sayfa Bulunamadı</h1>
      <p className="mt-2 max-w-md text-secondary-500">
        Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanılamaz durumda olabilir.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button>
            <Home className="h-4 w-4" />
            Ana Sayfa
          </Button>
        </Link>
        <Link href="/arama">
          <Button variant="outline">
            <Search className="h-4 w-4" />
            Ürün Ara
          </Button>
        </Link>
      </div>
    </div>
  );
}
