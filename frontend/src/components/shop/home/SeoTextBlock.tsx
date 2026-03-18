'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SeoTextBlockProps {
  title?: string;
  content: string;
  expandable?: boolean;
}

export function SeoTextBlock({ title, content, expandable = false }: SeoTextBlockProps) {
  const [expanded, setExpanded] = useState(!expandable);

  if (!content) return null;

  return (
    <section className="bg-white py-10">
      <div className="container-main">
        {title && (
          <div className="section-header">
            <h2 className="section-title">{title}</h2>
          </div>
        )}

        <div
          className={`prose prose-sm max-w-none text-secondary-600 ${
            !expanded ? 'max-h-24 overflow-hidden relative' : ''
          }`}
        >
          <div dangerouslySetInnerHTML={{ __html: content }} />
          {!expanded && (
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        {expandable && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-600 transition-colors"
          >
            {expanded ? (
              <>Daha az göster <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Devamını oku <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
