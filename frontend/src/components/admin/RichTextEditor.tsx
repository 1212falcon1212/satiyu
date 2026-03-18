'use client';

import { useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered,
  Heading1, Heading2, Heading3, Link, Image,
  AlignLeft, AlignCenter, AlignRight, Quote, Minus, Undo, Redo, Code,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent stealing focus from contentEditable
        onClick();
      }}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-secondary-200" />;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Set initial content only once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, [value]);

  // If value changes externally (e.g. loading post data), update
  useEffect(() => {
    if (editorRef.current && isInitialized.current) {
      // Only update if the external value differs from current innerHTML
      // This handles the case where post data loads after initial mount
      const current = editorRef.current.innerHTML;
      if (value !== current && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const syncContent = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    syncContent();
  }, [syncContent]);

  const formatBlock = useCallback((tag: string) => {
    exec('formatBlock', tag);
  }, [exec]);

  const insertLink = useCallback(() => {
    const url = prompt('Link URL:');
    if (url) exec('createLink', url);
  }, [exec]);

  const insertImage = useCallback(() => {
    const url = prompt('Görsel URL:');
    if (url) exec('insertImage', url);
  }, [exec]);

  return (
    <div className="rounded-lg border border-secondary-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-secondary-200 bg-secondary-50 px-2 py-1.5">
        <ToolbarButton icon={Undo} label="Geri Al" onClick={() => exec('undo')} />
        <ToolbarButton icon={Redo} label="İleri Al" onClick={() => exec('redo')} />

        <ToolbarDivider />

        <ToolbarButton icon={Heading1} label="Başlık 1" onClick={() => formatBlock('h1')} />
        <ToolbarButton icon={Heading2} label="Başlık 2" onClick={() => formatBlock('h2')} />
        <ToolbarButton icon={Heading3} label="Başlık 3" onClick={() => formatBlock('h3')} />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); formatBlock('p'); }}
          title="Paragraf"
          className="flex h-8 items-center justify-center rounded px-2 text-xs font-medium text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
        >
          P
        </button>

        <ToolbarDivider />

        <ToolbarButton icon={Bold} label="Kalın" onClick={() => exec('bold')} />
        <ToolbarButton icon={Italic} label="İtalik" onClick={() => exec('italic')} />
        <ToolbarButton icon={Underline} label="Altı Çizili" onClick={() => exec('underline')} />

        <ToolbarDivider />

        <ToolbarButton icon={List} label="Madde Listesi" onClick={() => exec('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} label="Numaralı Liste" onClick={() => exec('insertOrderedList')} />
        <ToolbarButton icon={Quote} label="Alıntı" onClick={() => formatBlock('blockquote')} />

        <ToolbarDivider />

        <ToolbarButton icon={AlignLeft} label="Sola Hizala" onClick={() => exec('justifyLeft')} />
        <ToolbarButton icon={AlignCenter} label="Ortala" onClick={() => exec('justifyCenter')} />
        <ToolbarButton icon={AlignRight} label="Sağa Hizala" onClick={() => exec('justifyRight')} />

        <ToolbarDivider />

        <ToolbarButton icon={Link} label="Link Ekle" onClick={insertLink} />
        <ToolbarButton icon={Image} label="Görsel Ekle" onClick={insertImage} />
        <ToolbarButton icon={Minus} label="Yatay Çizgi" onClick={() => exec('insertHorizontalRule')} />
        <ToolbarButton icon={Code} label="Kod" onClick={() => formatBlock('pre')} />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={syncContent}
        onBlur={syncContent}
        data-placeholder={placeholder || 'İçeriğinizi buraya yazın...'}
        className="rich-editor min-h-[400px] px-5 py-4 text-sm text-secondary-800 leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-secondary-400"
      />
    </div>
  );
}
