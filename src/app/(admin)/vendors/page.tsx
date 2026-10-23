"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2, CheckCircle, XCircle, Package, Loader2, Truck } from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";
import type { Vendor } from "@/types";

function VendorModal({ vendor, onClose, onSave }: {
  vendor?: Vendor;
  onClose: () => void;
  onSave: (v: Partial<Vendor> & { id?: string }) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    phone: vendor?.phone ?? "",
    company: vendor?.company ?? "",
    category: vendor?.category ?? "",
    address: vendor?.address ?? "",
    gstNumber: vendor?.gstNumber ?? "",
    pincode: vendor?.pincode ?? "",
    pickupLocationNickname: vendor?.pickupLocationNickname ?? "",
    pickupContactName: vendor?.pickupContactName ?? "",
    pickupPhone: vendor?.pickupPhone ?? "",
    pickupAddressLine1: vendor?.pickupAddressLine1 ?? "",
    pickupAddressLine2: vendor?.pickupAddressLine2 ?? "",
    pickupCity: vendor?.pickupCity ?? "",
    pickupState: vendor?.pickupState ?? "",
    pickupCountry: vendor?.pickupCountry ?? "India",
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

  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRegister = async () => {
    if (!vendor?.id) return;
    setRegistering(true);
    setRegisterMsg(null);
    try {
      await onSave({ ...form, id: vendor.id });
      const res = await fetch("/api/shiprocket/register-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to register pickup location");
      set("pickupLocationNickname", data.pickupLocationNickname);
      setRegisterMsg({ type: "success", text: `Registered as "${data.pickupLocationNickname}" on Shiprocket.` });
    } catch (err) {
      setRegisterMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to register pickup location" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{vendor ? "Edit Vendor" : "Add New Vendor"}</h3>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
        <form id="vendor-form" onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name *", key: "name", placeholder: "Ahmed Al-Rashid" },
            { label: "Email *", key: "email", placeholder: "vendor@company.com" },
            { label: "Phone", key: "phone", placeholder: "+966 50 000 0000" },
            { label: "Company *", key: "company", placeholder: "Company Name" },
            { label: "Address", key: "address", placeholder: "Riyadh, Saudi Arabia" },
            { label: "GST Number", key: "gstNumber", placeholder: "22AAAAA0000A1Z5" },
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Shiprocket Pickup Location</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  value={form.pickupContactName}
                  onChange={(e) => set("pickupContactName", e.target.value)}
                  placeholder="e.g. Ahmed Al-Rashid"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Phone</label>
                <input
                  value={form.pickupPhone}
                  onChange={(e) => set("pickupPhone", e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Address Line 1</label>
              <input
                value={form.pickupAddressLine1}
                onChange={(e) => set("pickupAddressLine1", e.target.value)}
                placeholder="Building, street"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Address Line 2</label>
              <input
                value={form.pickupAddressLine2}
                onChange={(e) => set("pickupAddressLine2", e.target.value)}
                placeholder="Area, landmark (optional)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  value={form.pickupCity}
                  onChange={(e) => set("pickupCity", e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  value={form.pickupState}
                  onChange={(e) => set("pickupState", e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input
                  value={form.pickupCountry}
                  onChange={(e) => set("pickupCountry", e.target.value)}
                  placeholder="India"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                <input
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 110001"
                  inputMode="numeric"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location Nickname</label>
                <input
                  value={form.pickupLocationNickname}
                  onChange={(e) => set("pickupLocationNickname", e.target.value)}
                  placeholder="Auto-filled on register"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
            {vendor?.id ? (
              <>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registering}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {registering ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
                  {registering ? "Registering…" : "Register with Shiprocket"}
                </button>
                {registerMsg && (
                  <p className={`text-xs mt-1.5 rounded-lg px-2.5 py-1.5 border ${registerMsg.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}>
                    {registerMsg.text}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 mt-1.5">
                Fill in the pickup address above, save this vendor, then reopen it to register the pickup location with Shiprocket.
              </p>
            )}
          </div>
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
        </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
          <button type="submit" form="vendor-form"
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
            {vendor ? "Save Changes" : "Add Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { vendors, products, orders, loading, addVendor, updateVendor, deleteVendor } = useAdminStore();

  const parcelCount = (vendorId: string) => {
    return orders.filter((o) => o.shipments?.some((s) => s.vendorId === vendorId && s.status === "shipped")).length;
  };
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
        gstNumber: data.gstNumber ?? "",
        pincode: data.pincode ?? "",
        pickupLocationNickname: data.pickupLocationNickname ?? "",
        pickupContactName: data.pickupContactName ?? "",
        pickupPhone: data.pickupPhone ?? "",
        pickupAddressLine1: data.pickupAddressLine1 ?? "",
        pickupAddressLine2: data.pickupAddressLine2 ?? "",
        pickupCity: data.pickupCity ?? "",
        pickupState: data.pickupState ?? "",
        pickupCountry: data.pickupCountry ?? "",
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
                <th className="text-center text-slate-500 font-medium px-4 py-3">Parcels</th>
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
                  <td className="px-4 py-4 text-center font-medium text-slate-700">
                    <Link href={`/vendors/${vendor.id}`} className="hover:text-orange-500 hover:underline">
                      {parcelCount(vendor.id)}
                    </Link>
                  </td>
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
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">No vendors found.</td></tr>
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
