"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Tag, Package, ExternalLink } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { vendors, products } = useAdminStore();

  const vendor = vendors.find((v) => v.id === id);
  const vendorProducts = products.filter((p) => p.vendorId === id);

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-lg font-medium">Vendor not found</p>
        <Link href="/vendors" className="mt-3 text-orange-500 hover:underline text-sm">Back to vendors</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Vendor Profile</h2>
          <p className="text-slate-400 text-sm">{vendor.company}</p>
        </div>
      </div>

      {/* Vendor Info Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Image src={vendor.avatar} alt={vendor.name} width={64} height={64} className="rounded-2xl" unoptimized />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-800">{vendor.name}</h3>
                <StatusBadge status={vendor.status} />
              </div>
              <p className="text-slate-500 text-sm font-medium">{vendor.company}</p>
              <p className="text-slate-400 text-xs mt-0.5">Joined {vendor.joinedAt}</p>
            </div>
          </div>
          <Link href={`/vendors`} onClick={(e) => { e.preventDefault(); (document.querySelector(`[data-vendor-edit="${vendor.id}"]`) as HTMLButtonElement)?.click(); }}
            className="hidden">edit</Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3">
            <Mail size={15} className="text-orange-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Email</p>
              <p className="text-sm text-slate-700 font-medium">{vendor.email}</p>
            </div>
          </div>
          {vendor.phone && (
            <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3">
              <Phone size={15} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Phone</p>
                <p className="text-sm text-slate-700 font-medium">{vendor.phone}</p>
              </div>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3">
              <MapPin size={15} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Address</p>
                <p className="text-sm text-slate-700 font-medium">{vendor.address}</p>
              </div>
            </div>
          )}
          {vendor.category && (
            <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3">
              <Tag size={15} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Category</p>
                <p className="text-sm text-slate-700 font-medium">{vendor.category}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center bg-orange-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-orange-600">{vendorProducts.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Products</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-slate-700">
              {vendor.totalRevenue > 0 ? `${(vendor.totalRevenue / 1000).toFixed(1)}K` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Revenue (INR)</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-slate-700">
              {vendorProducts.reduce((s, p) => s + (p.sold ?? 0), 0)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Total Sold</p>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-orange-500" />
            <h3 className="font-semibold text-slate-800">Products by {vendor.name}</h3>
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{vendorProducts.length}</span>
          </div>
          <Link href="/products/new"
            className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1">
            + Add Product
          </Link>
        </div>

        {vendorProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">Products added under this vendor will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-slate-500 font-medium px-6 py-3">Product</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Category</th>
                  <th className="text-right text-slate-500 font-medium px-4 py-3">Price</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Stock</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Sold</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vendorProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={product.images[0]} alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                        )}
                        <div>
                          <p className="font-medium text-slate-800 max-w-[200px] truncate">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{product.category}</td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-semibold text-slate-800">₹{product.price.toLocaleString()}</p>
                      {product.originalPrice > product.price && (
                        <p className="text-xs text-slate-400 line-through">₹{product.originalPrice.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-slate-700">{product.stock}</td>
                    <td className="px-4 py-4 text-center text-slate-700">{product.sold ?? 0}</td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={product.status} /></td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/products/${product.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit product">
                          <Pencil size={14} />
                        </Link>
                        <a href={`http://localhost:3000/product/${product.slug}`} target="_blank" rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="View on website">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
