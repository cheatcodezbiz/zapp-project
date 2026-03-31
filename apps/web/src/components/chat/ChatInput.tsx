"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import type { ImageAttachment } from "@zapp/shared-types";
import { cn } from "@zapp/ui";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInputProps {
  onSendMessage: (message: string, images?: ImageAttachment[]) => void;
  isStreaming: boolean;
}

function processImageFile(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize if larger than 1024px on any side
        const maxSize = 1024;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG at 70% quality for compression
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64 = dataUrl.split(',')[1] || '';

        resolve({
          id: crypto.randomUUID(),
          data: base64,
          mimeType: 'image/jpeg',
          width,
          height,
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Multi-line chat input with send button.
 * Enter sends, Shift+Enter adds a new line.
 * Auto-grows up to 6 lines then scrolls.
 */
export function ChatInput({ onSendMessage, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canSend = (value.trim().length > 0 || images.length > 0) && !isStreaming;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSendMessage(value, images.length > 0 ? images : undefined);
    setValue("");
    setImages([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, value, images, onSendMessage]);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const processed = await Promise.all(
      fileArray.slice(0, 4).map(processImageFile)
    );
    setImages(prev => [...prev, ...processed].slice(0, 4));
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addImages(imageFiles);
    }
  }, [addImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  }, [addImages]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);

  return (
    <div
      className={cn(
        "bg-surface-container-low p-4",
        isDragging && "ring-2 ring-primary ring-inset"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {images.length > 0 && (
        <div className="mb-2 flex gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative h-16 w-16 overflow-hidden rounded-md border border-outline-variant/30">
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.name || "Attached image"}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] text-on-error opacity-0 transition-opacity group-hover:opacity-100"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Attach image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 00-2.828 0L6 21" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addImages(e.target.files);
            e.target.value = '';
          }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isStreaming
              ? "Waiting for response..."
              : "Describe what you want to build..."
          }
          disabled={isStreaming}
          rows={1}
          className="max-h-36 min-h-[40px] flex-1 resize-none rounded-sm bg-surface-container-highest px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 outline-none transition-all focus:shadow-[0_0_0_1px_rgba(73,69,79,0.15),0_0_15px_rgba(143,245,255,0.1)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-all hover:shadow-[0_0_20px_rgba(143,245,255,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
