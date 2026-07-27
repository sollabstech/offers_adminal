"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2, Star } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";

export default function VendorProductsPage() {
  const { products, vendorId, loading, deleteProduct } = useAdminStore();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const myProducts = products.filter((p) => p.vendorId === vendorId);

  const filtered = myProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Products</h2>
          <p className="text-slate-400 text-sm">{myProducts.length} products in your catalog</p>
        </div>
        <Link
          href="/vendor/products/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
      </div>

      {loading && myProducts.length === 0 && <TableSkeleton rows={5} cols={7} />}
      {(!loading || myProducts.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-slate-500 font-medium px-6 py-3">Product</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Category</th>
                  <th className="text-right text-slate-500 font-medium px-4 py-3">Price</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Stock</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Sold</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Rating</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{product.category}</td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-semibold text-slate-800">₹{product.price.toLocaleString()}</p>
                      {product.originalPrice > product.price && (
                        <p className="text-xs text-slate-400 line-through">
                          ₹{product.originalPrice.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-medium ${product.stock === 0 ? "text-red-500" : product.stock < 20 ? "text-amber-500" : "text-slate-700"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600">{product.sold.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-amber-500 font-medium">
                        <Star size={12} fill="currentColor" />
                        {product.rating}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/vendor/products/${product.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(product.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      {myProducts.length === 0 ? "No products yet. Add your first product!" : "No products found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Product?</h3>
            <p className="text-slate-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
