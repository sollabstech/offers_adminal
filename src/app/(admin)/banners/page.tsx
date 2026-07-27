"use client";

import { useState } from "react";
import { Image, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Link as LinkIcon } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import BannerImageUpload from "@/components/BannerImageUpload";
import type { Banner } from "@/types";

const EMPTY_FORM = {
  title: "",
  imageUrl: "",
  linkHref: "",
  active: true,
};

export default function BannersPage() {
  const { banners, saveBanner, deleteBanner } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkHref: banner.linkHref,
      active: banner.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) return;
    setSaving(true);
    const id = editingId ?? `banner-${Date.now()}`;
    const existing = banners.find((b) => b.id === id);
    const banner: Banner = {
      id,
      title: form.title,
      imageUrl: form.imageUrl,
      linkHref: form.linkHref,
      active: form.active,
      order: existing?.order ?? banners.length,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await saveBanner(banner);
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteBanner(id);
    setDeletingId(null);
  };

  const handleToggleActive = async (banner: Banner) => {
    await saveBanner({ ...banner, active: !banner.active });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const a = banners[index];
    const b = banners[index - 1];
    await Promise.all([
      saveBanner({ ...a, order: b.order }),
      saveBanner({ ...b, order: a.order }),
    ]);
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const a = banners[index];
    const b = banners[index + 1];
    await Promise.all([
      saveBanner({ ...a, order: b.order }),
      saveBanner({ ...b, order: a.order }),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Banner Management</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage hero carousel banners shown on the homepage. Recommended size: <strong>1600 × 500 px</strong>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-colors"
        >
          <Plus size={16} />
          Add Banner
        </button>
      </div>

      {/* Size hint card */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-5 py-3 flex items-start gap-3">
        <Image size={18} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-orange-700">Best banner size: 1600 × 500 px</p>
          <p className="text-orange-600 mt-0.5">
            Aspect ratio 3.2 : 1. Minimum 1280 × 400 px.
          </p>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            {editingId ? "Edit Banner" : "Add New Banner"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Banner Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Big Deals on Electronics"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Banner Image *
              </label>
              <BannerImageUpload
                value={form.imageUrl}
                onChange={(url) => set("imageUrl", url)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Link URL <span className="text-slate-400 font-normal">(optional — where banner click goes)</span>
              </label>
              <input
                value={form.linkHref}
                onChange={(e) => set("linkHref", e.target.value)}
                placeholder="/category/electronics"
                className="input-field"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set("active", e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">Show on website (active)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.imageUrl}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-orange-500/20"
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Banner"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center text-slate-400">
          <Image size={36} className="mx-auto mb-3 text-slate-200" />
          <p className="font-medium">No banners yet</p>
          <p className="text-sm mt-1">Click "Add Banner" to create your first homepage banner.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex gap-4 items-center px-4 py-3 transition-all ${
                banner.active ? "border-slate-100" : "border-slate-100 opacity-60"
              }`}
            >
              {/* Drag handle / order controls */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 text-slate-400 text-xs"
                  title="Move up"
                >
                  ▲
                </button>
                <GripVertical size={14} className="text-slate-300" />
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === banners.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 text-slate-400 text-xs"
                  title="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-28 h-16 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-100">
                {banner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Image size={20} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{banner.title}</p>
                {banner.linkHref && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <LinkIcon size={10} />
                    {banner.linkHref}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5 truncate">{banner.imageUrl}</p>
              </div>

              {/* Status badge */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                banner.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}>
                {banner.active ? "Active" : "Hidden"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(banner)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  title={banner.active ? "Hide" : "Show"}
                >
                  {banner.active ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => openEdit(banner)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  disabled={deletingId === banner.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: #f97316; background: white; }
      `}</style>
    </div>
  );
}
