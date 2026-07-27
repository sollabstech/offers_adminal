"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/store/adminStore";
import SpecificationsEditor from "@/components/SpecificationsEditor";
import MultiImageUpload from "@/components/MultiImageUpload";
import type { Product } from "@/types";

export default function VendorNewProductPage() {
  const router = useRouter();
  const { addProduct, vendors, vendorId } = useAdminStore();
  const vendor = vendors.find((v) => v.id === vendorId);
  const [saving, setSaving] = useState(false);
  const [specs, setSpecs] = useState<{ key: string; val: string }[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    stock: "",
    tags: "",
    status: "active" as Product["status"],
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    const product: Product = {
      id: `p${Date.now()}`,
      name: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, "-"),
      description: form.description,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      category: form.category,
      vendorId: vendorId,
      vendorName: vendor?.name ?? "",
      stock: Number(form.stock),
      sold: 0,
      status: form.status,
      images: images.length > 0 ? images : [`https://placehold.co/400x400/1e293b/f97316?text=${encodeURIComponent(form.name.slice(0, 10))}`],
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      specifications: Object.fromEntries(specs.filter((s) => s.key).map((s) => [s.key, s.val])),
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    await addProduct(product);
    router.push("/vendor/products");
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vendor/products" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Add New Product</h2>
          <p className="text-slate-400 text-sm">Listed under {vendor?.name ?? "your store"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Basic Info</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name *</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)}
              className="input-field" placeholder="e.g. Wireless Headphones" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
            <textarea required value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} className="input-field resize-none" placeholder="Describe the product..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (INR) *</label>
              <input required type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)}
                className="input-field" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Original Price (INR)</label>
              <input type="number" min="0" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)}
                className="input-field" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
              <select required value={form.category} onChange={(e) => set("category", e.target.value)} className="input-field">
                <option value="">Select category</option>
                {["Electronics", "Clothing", "Home & Garden", "Sports", "Toys", "Beauty", "Books", "Food"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Stock *</label>
              <input required type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)}
                className="input-field" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value as Product["status"])} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
              className="input-field" placeholder="e.g. wireless, audio, premium" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Product Photos</h3>
          <MultiImageUpload images={images} onChange={setImages} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Specifications</h3>
          <p className="text-xs text-slate-400 -mt-2">Shown in the Specifications tab on the product page (e.g. Brand → Apple, Weight → 1.2kg)</p>
          <SpecificationsEditor value={specs} onChange={setSpecs} />
        </div>

        <div className="flex gap-3">
          <Link href="/vendor/products" className="flex-1 py-3 text-center rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20">
            {saving ? "Saving..." : "Add Product"}
          </button>
        </div>
      </form>

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
