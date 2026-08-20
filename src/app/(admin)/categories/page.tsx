"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown, Tag, ChevronRight, ChevronDown as ExpandDown, Layers,
} from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import type { Category, Subcategory } from "@/types";

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars like & first
    .trim()
    .replace(/\s+/g, "-")            // spaces to dashes
    .replace(/-+/g, "-");            // collapse double dashes
}

const EMPTY_FORM = { name: "", slug: "", active: true };
const EMPTY_SUB = { name: "", slug: "", active: true };

/* ─── Subcategory row ──────────────────────────────────────── */
function SubcategoryRow({
  sub, onEdit, onDelete, onToggle,
}: {
  sub: Subcategory;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 last:border-0 hover:bg-orange-50/40 transition-colors">
      <div className="w-6 flex items-center justify-center">
        <Layers size={13} className="text-slate-300" />
      </div>
      <span className="flex-1 text-sm text-slate-700 font-medium">{sub.name}</span>
      <span className="font-mono text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded hidden sm:inline">{sub.slug}</span>
      <button onClick={onToggle} className="shrink-0">
        {sub.active
          ? <ToggleRight size={20} className="text-emerald-500" />
          : <ToggleLeft size={20} className="text-slate-300" />}
      </button>
      <button onClick={onEdit}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
        <Pencil size={13} />
      </button>
      <button onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────── */
export default function CategoriesPage() {
  const { categories, saveCategory, deleteCategory } = useAdminStore();

  // Category form
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Expanded categories (show subcategories)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Subcategory form
  const [subModal, setSubModal] = useState<{ catId: string; sub?: Subcategory } | null>(null);
  const [subForm, setSubForm] = useState(EMPTY_SUB);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<{ catId: string; subId: string } | null>(null);

  /* ── Category actions ── */
  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, active: cat.active });
    setShowForm(true);
  };
  const handleNameChange = (name: string) => setForm((f) => ({ ...f, name, slug: slugify(name) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const cleanSlug = slugify(form.name); // always regenerate to fix any bad slugs
    if (editing) {
      await saveCategory({ ...editing, name: form.name, slug: cleanSlug, active: form.active });
    } else {
      await saveCategory({ id: `cat_${Date.now()}`, name: form.name, slug: cleanSlug, active: form.active, description: "", imageUrl: "", order: categories.length, createdAt: now });
    }
    setShowForm(false);
  };

  const handleToggleActive = async (cat: Category) => saveCategory({ ...cat, active: !cat.active });

  const handleReorder = async (cat: Category, dir: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await Promise.all([saveCategory({ ...cat, order: swap.order }), saveCategory({ ...swap, order: cat.order })]);
  };

  /* ── Subcategory actions ── */
  const openNewSub = (catId: string) => { setSubModal({ catId }); setSubForm(EMPTY_SUB); };
  const openEditSub = (catId: string, sub: Subcategory) => { setSubModal({ catId, sub }); setSubForm({ name: sub.name, slug: sub.slug, active: sub.active }); };

  const handleSubNameChange = (name: string) => setSubForm((f) => ({ ...f, name, slug: slugify(name) }));

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subModal) return;
    const cat = categories.find((c) => c.id === subModal.catId);
    if (!cat) return;
    const subs = cat.subcategories ?? [];
    const cleanSubSlug = slugify(subForm.name);
    let updated: Subcategory[];
    if (subModal.sub) {
      updated = subs.map((s) => s.id === subModal.sub!.id ? { ...s, name: subForm.name, slug: cleanSubSlug, active: subForm.active } : s);
    } else {
      updated = [...subs, { id: `sub_${Date.now()}`, name: subForm.name, slug: cleanSubSlug, active: subForm.active }];
    }
    await saveCategory({ ...cat, subcategories: updated });
    setSubModal(null);
  };

  const handleToggleSub = async (cat: Category, sub: Subcategory) => {
    const updated = (cat.subcategories ?? []).map((s) => s.id === sub.id ? { ...s, active: !s.active } : s);
    await saveCategory({ ...cat, subcategories: updated });
  };

  const handleDeleteSub = async () => {
    if (!confirmDeleteSub) return;
    const cat = categories.find((c) => c.id === confirmDeleteSub.catId);
    if (!cat) return;
    const updated = (cat.subcategories ?? []).filter((s) => s.id !== confirmDeleteSub.subId);
    await saveCategory({ ...cat, subcategories: updated });
    setConfirmDeleteSub(null);
  };

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Categories</h2>
          <p className="text-slate-400 text-sm">{categories.length} categories · {categories.reduce((n, c) => n + (c.subcategories?.length ?? 0), 0)} subcategories</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* ── Category form modal ── */}
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
                  <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Dress" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cat-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                  <label htmlFor="cat-active" className="text-sm font-medium text-slate-700">Active (visible on website)</label>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" form="cat-form" className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">{editing ? "Save Changes" : "Add Category"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subcategory form modal ── */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
                {categories.find((c) => c.id === subModal.catId)?.name}
              </p>
              <h3 className="text-lg font-bold text-slate-800">{subModal.sub ? "Edit Subcategory" : "Add Subcategory"}</h3>
            </div>
            <form id="sub-form" onSubmit={handleSubSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory Name *</label>
                <input required value={subForm.name} onChange={(e) => handleSubNameChange(e.target.value)}
                  placeholder="e.g. Men's Dress" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sub-active" checked={subForm.active} onChange={(e) => setSubForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <label htmlFor="sub-active" className="text-sm font-medium text-slate-700">Active</label>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setSubModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" form="sub-form" className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">{subModal.sub ? "Save" : "Add Subcategory"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category list ── */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Tag size={24} className="text-slate-400" /></div>
          <p className="text-slate-500 text-sm">No categories yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((cat, idx) => {
            const isExpanded = expanded.has(cat.id);
            const subs = cat.subcategories ?? [];
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Category row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => handleReorder(cat, "up")} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => handleReorder(cat, "down")} disabled={idx === sorted.length - 1} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded((prev) => { const n = new Set(prev); isExpanded ? n.delete(cat.id) : n.add(cat.id); return n; })}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    {isExpanded ? <ExpandDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0"><Tag size={16} className="text-orange-500" /></div>

                  {/* Name + subcategory count */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{cat.name}</p>
                    <p className="text-xs text-slate-400">{subs.length} subcategor{subs.length === 1 ? "y" : "ies"} · <span className="font-mono">{cat.slug}</span></p>
                  </div>

                  {/* Active toggle */}
                  <button onClick={() => handleToggleActive(cat)} className="shrink-0">
                    {cat.active ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                  </button>

                  {/* Edit / delete */}
                  <button onClick={() => openEdit(cat)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete(cat.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"><Trash2 size={14} /></button>
                </div>

                {/* Subcategories panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {subs.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-3">No subcategories yet.</p>
                    ) : (
                      subs.map((sub) => (
                        <SubcategoryRow
                          key={sub.id}
                          sub={sub}
                          onEdit={() => openEditSub(cat.id, sub)}
                          onDelete={() => setConfirmDeleteSub({ catId: cat.id, subId: sub.id })}
                          onToggle={() => handleToggleSub(cat, sub)}
                        />
                      ))
                    )}
                    <div className="px-4 py-2.5 bg-slate-50">
                      <button
                        onClick={() => openNewSub(cat.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600"
                      >
                        <Plus size={13} /> Add Subcategory
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete category confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Category?</h3>
            <p className="text-slate-500 text-sm mb-5">This will permanently remove the category and all its subcategories.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={async () => { await deleteCategory(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete subcategory confirm ── */}
      {confirmDeleteSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Subcategory?</h3>
            <p className="text-slate-500 text-sm mb-5">This will permanently remove this subcategory.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteSub(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteSub} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
