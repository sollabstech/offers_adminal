"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
}

function resizeAndCompress(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const TARGET_W = 1600;
      const TARGET_H = 500;
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext("2d")!;

      // Cover-fill: scale so the image fills 1600×500 then center-crop
      const scale = Math.max(TARGET_W / img.width, TARGET_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (TARGET_W - w) / 2, (TARGET_H - h) / 2, w, h);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  });
}

export default function BannerImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await resizeAndCompress(file);
    onChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-36 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Banner preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-white text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFile(file);
          }}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
        >
          <Upload size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Click to browse or drag & drop</p>
          <p className="text-slate-400 text-xs mt-1">PNG, JPG, WEBP · Auto-resized to 1600 × 500 px</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
