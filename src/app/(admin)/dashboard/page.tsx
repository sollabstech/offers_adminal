"use client";

import { useAdminStore } from "@/store/adminStore";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { revenueData } from "@/data/mockData";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  DollarSign, ShoppingCart, Package, Users, Store, TrendingUp, AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { products, vendors, users, orders } = useAdminStore();

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);

  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const vendorSummary = vendors.map((vendor) => {
    const vProducts = products.filter((p) => p.vendorId === vendor.id);
    const vProductIds = new Set(vProducts.map((p) => p.id));
    const vOrders = orders.filter((o) => o.items.some((item) => vProductIds.has(item.productId)));
    const sold = vProducts.reduce((s, p) => s + p.sold, 0);
    const revenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => {
        const items = o.items.filter((item) => vProductIds.has(item.productId));
        return sum + items.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);
    return { ...vendor, productCount: vProducts.length, orderCount: vOrders.length, sold, revenue };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}K`} change="18.2%" positive icon={DollarSign} color="orange" />
        <StatCard title="Total Orders" value={orders.length.toString()} change="12.5%" positive icon={ShoppingCart} color="blue" />
        <StatCard title="Products" value={products.length.toString()} change="4.3%" positive icon={Package} color="green" />
        <StatCard title="Users" value={users.length.toString()} change="9.1%" positive icon={Users} color="purple" />
        <StatCard title="Vendors" value={vendors.length.toString()} change="2" positive icon={Store} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-800">Revenue Overview</h2>
              <p className="text-slate-400 text-sm">Monthly revenue for 2025</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold">
              <TrendingUp size={12} />
              +18.2% this month
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by month */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Orders per Month</h2>
          <p className="text-slate-400 text-sm mb-6">2025 trend</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Vendor Performance</h2>
            <p className="text-slate-400 text-xs mt-0.5">Sorted by revenue · all time</p>
          </div>
          <Store size={18} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-slate-500 font-medium px-6 py-3">Vendor</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Products</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Orders</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Sold</th>
                <th className="text-right text-slate-500 font-medium px-4 py-3">Revenue</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vendorSummary.map((v) => (
                <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${v.status === "suspended" ? "opacity-60" : ""}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {v.status === "suspended" && <AlertCircle size={14} className="text-red-400 shrink-0" />}
                      <div>
                        <p className="font-medium text-slate-800">{v.name}</p>
                        <p className="text-xs text-slate-400">{v.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{v.productCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{v.orderCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{v.sold.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {v.revenue > 0 ? `₹${(v.revenue / 1000).toFixed(1)}K` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
              {vendorSummary.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No vendors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-slate-500 font-medium pb-3">Order ID</th>
                  <th className="text-left text-slate-500 font-medium pb-3">Customer</th>
                  <th className="text-right text-slate-500 font-medium pb-3">Total</th>
                  <th className="text-center text-slate-500 font-medium pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono text-xs text-slate-600">{order.id}</td>
                    <td className="py-3 text-slate-700 font-medium">{order.userName}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">₹{order.total.toLocaleString()}</td>
                    <td className="py-3 text-center"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Top Selling Products</h2>
          <div className="space-y-4">
            {topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.sold} sold · ₹{product.price.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">₹{(product.sold * product.price / 1000).toFixed(1)}K</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
