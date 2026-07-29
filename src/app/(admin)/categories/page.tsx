"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Tag } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import type { Category } from "@/types";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  active: true,
};

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function CategoriesPage() {
  const { categories, saveCategory, deleteCategory } = useAdminStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description, imageUrl: cat.imageUrl, active: cat.active });
    setShowForm(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (editing) {
      await saveCategory({ ...editing, ...form });
    } else {
      await saveCategory({
        id: `cat_${Date.now()}`,
        ...form,
        order: categories.length,
        createdAt: now,
      });
    }
    setShowForm(false);
  };

  const handleToggleActive = async (cat: Category) => {
    await saveCategory({ ...cat, active: !cat.active });
  };

  const handleReorder = async (cat: Category, dir: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([
      saveCategory({ ...cat, order: swap.order }),
      saveCategory({ ...swap, order: cat.order }),
    ]);
  };

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Categories</h2>
          <p className="text-slate-400 text-sm">{categories.length} categories</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editing ? "Edit Category" : "Add Category"}</h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <form id="cat-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="electronics"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">Auto-generated from name. Used in URLs.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description of this category"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  />
                  {form.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cat-active"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <label htmlFor="cat-active" className="text-sm font-medium text-slate-700">Active (visible on website)</label>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" form="cat-form"
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
                {editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Tag size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">No categories yet. Add your first one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-slate-500 font-medium px-6 py-3 w-10">Order</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Category</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Slug</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Description</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleReorder(cat, "up")} disabled={idx === 0}
                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => handleReorder(cat, "down")} disabled={idx === sorted.length - 1}
                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                          <Tag size={16} className="text-orange-500" />
                        </div>
                      )}
                      <p className="font-medium text-slate-800">{cat.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{cat.slug}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-slate-500 max-w-xs truncate">{cat.description || "—"}</td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => handleToggleActive(cat)}>
                      {cat.active
                        ? <ToggleRight size={24} className="text-emerald-500 mx-auto" />
                        : <ToggleLeft size={24} className="text-slate-300 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(cat)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(cat.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Category?</h3>
            <p className="text-slate-500 text-sm mb-5">This will permanently remove the category.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={async () => { await deleteCategory(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
