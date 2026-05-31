import React, { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '../types';

interface FileAttachmentProps {
  attachments: Attachment[];
  onAdd: (attachment: Attachment) => void;
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <path fill="white" d="M14 2v6h6" />
        <text x="6" y="18" fontSize="5" fill="white" fontWeight="bold">PDF</text>
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export function FileAttachment({ attachments, onAdd, onRemove }: FileAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onAdd({
          id: uuidv4(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map(att => (
            <div key={att.id} className="group relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 pr-3">
              {att.type.startsWith('image/') ? (
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="w-10 h-10 object-cover rounded-md"
                />
              ) : (
                <FileIcon type={att.type} />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{att.name}</p>
                <p className="text-xs text-gray-400">{formatSize(att.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        הוסף קובץ
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}
