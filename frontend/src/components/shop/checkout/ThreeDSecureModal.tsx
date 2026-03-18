'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

interface Props {
  html: string;
  onClose: () => void;
}

export default function ThreeDSecureModal({ html, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    // Write 3D Secure HTML into iframe
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-secondary-900">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            3D Secure Dogrulama
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
          >
            &times;
          </button>
        </div>
        <div className="p-2">
          <iframe
            ref={iframeRef}
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
            className="w-full rounded-lg border-0"
            style={{ height: '500px' }}
            title="3D Secure"
          />
        </div>
      </div>
    </div>
  );
}
