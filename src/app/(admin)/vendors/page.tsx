"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2, CheckCircle, XCircle, Package } from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";
import type { Vendor } from "@/types";

function VendorModal({ vendor, onClose, onSave }: {
  vendor?: Vendor;
  onClose: () => void;
  onSave: (v: Partial<Vendor> & { id?: string }) => void;
}) {
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    phone: vendor?.phone ?? "",
    company: vendor?.company ?? "",
    category: vendor?.category ?? "",
    address: vendor?.address ?? "",
    username: vendor?.username ?? "",
    password: vendor?.password ?? "",
    status: vendor?.status ?? "pending" as Vendor["status"],
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: vendor?.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-slate-800 mb-5">{vendor ? "Edit Vendor" : "Add New Vendor"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name *", key: "name", placeholder: "Ahmed Al-Rashid" },
            { label: "Email *", key: "email", placeholder: "vendor@company.com" },
            { label: "Phone", key: "phone", placeholder: "+966 50 000 0000" },
            { label: "Company *", key: "company", placeholder: "Company Name" },
            { label: "Address", key: "address", placeholder: "Riyadh, Saudi Arabia" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                required={label.includes("*")}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
          ))}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Login Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="vendor_username"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  required={!vendor}
                  type="text"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={vendor ? "Leave blank to keep" : "Set password"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400">
                <option value="">Select...</option>
                {["Electronics", "Clothing", "Home & Garden", "Sports", "Toys", "Beauty", "Food"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as Vendor["status"])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
              {vendor ? "Save Changes" : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { vendors, products, loading, addVendor, updateVendor, deleteVendor } = useAdminStore();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"new" | Vendor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.company.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: Partial<Vendor> & { id?: string }) => {
    if (data.id) {
      await updateVendor(data.id, data);
    } else {
      await addVendor({
        id: `v${Date.now()}`,
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        category: data.category ?? "",
        address: data.address ?? "",
        username: data.username ?? "",
        password: data.password ?? "",
        status: data.status ?? "pending",
        productsCount: 0,
        totalRevenue: 0,
        joinedAt: new Date().toISOString().split("T")[0],
        avatar: `https://placehold.co/40x40/f97316/ffffff?text=${(data.name ?? "V")[0].toUpperCase()}`,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Vendors</h2>
          <p className="text-slate-400 text-sm">{vendors.length} registered vendors</p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
      </div>

      {loading && vendors.length === 0 && <TableSkeleton rows={5} cols={8} />}
      {(!loading || vendors.length > 0) && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-slate-500 font-medium px-6 py-3">Vendor</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Company</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Category</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Products</th>
                <th className="text-right text-slate-500 font-medium px-4 py-3">Revenue</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Joined</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Image src={vendor.avatar} alt={vendor.name} width={36} height={36} className="rounded-full" unoptimized />
                      <div>
                        <p className="font-medium text-slate-800">{vendor.name}</p>
                        <p className="text-xs text-slate-400">{vendor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{vendor.company}</td>
                  <td className="px-4 py-4 text-slate-600">{vendor.category || "—"}</td>
                  <td className="px-4 py-4 text-center font-medium text-slate-700">{products.filter((p) => p.vendorId === vendor.id).length}</td>
                  <td className="px-4 py-4 text-right font-semibold text-slate-800">
                    {vendor.totalRevenue > 0 ? `₹${(vendor.totalRevenue / 1000).toFixed(1)}K` : "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-500">{vendor.joinedAt}</td>
                  <td className="px-4 py-4 text-center"><StatusBadge status={vendor.status} /></td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/vendors/${vendor.id}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="View products">
                        <Package size={14} />
                      </Link>
                      {vendor.status === "pending" && (
                        <button onClick={() => void updateVendor(vendor.id, { status: "active" })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Approve">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {vendor.status === "active" && (
                        <button onClick={() => void updateVendor(vendor.id, { status: "suspended" })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Suspend">
                          <XCircle size={14} />
                        </button>
                      )}
                      {vendor.status === "suspended" && (
                        <button onClick={() => void updateVendor(vendor.id, { status: "active" })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Reactivate">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button data-vendor-edit={vendor.id} onClick={() => setModal(vendor)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit vendor">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(vendor.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete vendor">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {modal && (
        <VendorModal
          vendor={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Vendor?</h3>
            <p className="text-slate-500 text-sm mb-5">This will permanently remove the vendor and their data.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={async () => { await deleteVendor(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
