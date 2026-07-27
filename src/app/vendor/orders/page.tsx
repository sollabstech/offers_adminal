"use client";

import { useState } from "react";
import { Fragment } from "react";
import Image from "next/image";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";
import type { Order } from "@/types";

const STATUS_OPTIONS: Order["status"][] = [
  "pending", "processing", "shipped", "delivered", "cancelled",
];

export default function VendorOrdersPage() {
  const { orders, products, vendorId, loading } = useAdminStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const myProductIds = new Set(
    products.filter((p) => p.vendorId === vendorId).map((p) => p.id)
  );

  const myOrders = orders.filter((o) =>
    o.items.some((item) => myProductIds.has(item.productId))
  );

  const filtered = myOrders
    .filter((o) => {
      const matchSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.userName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const revenue = myOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => {
      const items = o.items.filter((item) => myProductIds.has(item.productId));
      return sum + items.reduce((s, item) => s + item.price * item.quantity, 0);
    }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Orders</h2>
          <p className="text-slate-400 text-sm">{myOrders.length} orders containing your products</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600">
          Delivered revenue: <span className="font-bold text-emerald-600">₹{revenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === "all" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >All</button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >{s}</button>
          ))}
        </div>
      </div>

      {loading && myOrders.length === 0 && <TableSkeleton rows={5} cols={6} />}
      {(!loading || myOrders.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-slate-500 font-medium px-6 py-3">Order ID</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Customer</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Items</th>
                  <th className="text-right text-slate-500 font-medium px-4 py-3">Total</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Date</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                  <th className="text-center text-slate-500 font-medium px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((order) => {
                  const isExpanded = expanded === order.id;
                  const myItems = order.items.filter((item) => myProductIds.has(item.productId));
                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{order.id}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">{order.userName}</p>
                          <p className="text-xs text-slate-400">{order.userEmail}</p>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-600">{myItems.length}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-800">
                          ₹{order.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs">{order.createdAt}</td>
                        <td className="px-4 py-4 text-center"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : order.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mx-auto"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                              Your Items in this Order
                            </p>
                            <div className="space-y-2">
                              {myItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                  <Image src={item.productImage} alt={item.productName} width={40} height={40} className="rounded-lg" unoptimized />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                                    <p className="text-xs text-slate-400">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                                  </div>
                                  <p className="font-semibold text-slate-800 text-sm">
                                    ₹{(item.quantity * item.price).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-3">Shipping to: {order.shippingAddress}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
