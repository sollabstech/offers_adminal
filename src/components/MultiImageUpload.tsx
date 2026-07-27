"use client";

import { useRef, useCallback } from "react";
import { Upload, X, Star } from "lucide-react";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

export default function MultiImageUpload({ images, onChange, max = 4 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    }), []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const slots = max - images.length;
    if (slots <= 0) return;
    const picked = Array.from(files).slice(0, slots).filter((f) => f.type.startsWith("image/"));
    const encoded = await Promise.all(picked.map(readFile));
    onChange([...images, ...encoded]);
  }, [images, max, onChange, readFile]);

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const moveFirst = (i: number) => {
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              {/* Thumbnail badge */}
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Star size={8} fill="white" /> Thumbnail
                </div>
              )}
              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {i !== 0 && (
                  <button type="button" onClick={() => moveFirst(i)}
                    className="bg-white/90 text-slate-700 text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-white transition-colors">
                    Set as thumbnail
                  </button>
                )}
                <button type="button" onClick={() => remove(i)}
                  className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {images.length < max && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50 flex flex-col items-center justify-center gap-1 transition-colors">
              <Upload size={18} className="text-slate-300" />
              <span className="text-[10px] text-slate-400 font-medium">Add photo</span>
            </button>
          )}
        </div>
      )}

      {/* Empty state drop zone */}
      {images.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => { e.preventDefault(); await handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-slate-50 transition-colors"
        >
          <Upload size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Click to browse or drag & drop</p>
          <p className="text-slate-400 text-xs mt-1">Up to {max} photos · PNG, JPG, WEBP · 1000×1000 px recommended</p>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-slate-400">
        {images.length}/{max} photos · First photo is the thumbnail shown in listings, cart, search & orders
        {images.length < max && images.length > 0 && " · Click Add photo to add more"}
      </p>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => void handleFiles(e.target.files)} />
    </div>
  );
}
