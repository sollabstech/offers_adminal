"use client";

import { useAdminStore } from "@/store/adminStore";
import { revenueData } from "@/data/mockData";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Star } from "lucide-react";

const COLORS = ["#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b"];

export default function AnalyticsPage() {
  const { products, orders, users, vendors } = useAdminStore();

  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 8);
  const topByRevenue = [...products].sort((a, b) => (b.sold * b.price) - (a.sold * a.price)).slice(0, 5);

  const categoryRevenue = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + p.sold * p.price;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryRevenue).map(([name, value]) => ({ name, value }));

  const orderStatusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(orderStatusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value,
  }));

  const totalSold = products.reduce((s, p) => s + p.sold, 0);
  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const avgOrderValue = totalRevenue / (orders.filter((o) => o.status === "delivered").length || 1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items Sold", value: totalSold.toLocaleString(), sub: "across all products" },
          { label: "Delivered Revenue", value: `₹${(totalRevenue / 1000).toFixed(1)}K`, sub: "from completed orders" },
          { label: "Avg Order Value", value: `₹${avgOrderValue.toFixed(0)}`, sub: "delivered orders" },
          { label: "Active Vendors", value: vendors.filter((v) => v.status === "active").length.toString(), sub: `of ${vendors.length} total` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-sm font-medium text-slate-700 mt-1">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Category */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-800">Revenue Trend</h2>
              <p className="text-slate-400 text-sm">Monthly 2025</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold">
              <TrendingUp size={12} /> +18.2% YoY
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Revenue by Category</h2>
          <p className="text-slate-400 text-sm mb-4">Based on units sold</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {categoryData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-700">₹{(item.value / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top products + Order status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Most Selling Products</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={140}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
              <Tooltip formatter={(v: number) => [v, "Units Sold"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Bar dataKey="sold" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Order Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {statusData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-700">{item.value} orders</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top by Revenue</p>
            <div className="space-y-2">
              {topByRevenue.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-orange-50 text-orange-600 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-slate-600 truncate">{p.name}</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Star size={10} className="text-amber-400" fill="currentColor" />
                    {p.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Users growth */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Orders & Revenue Combined</h2>
        <p className="text-slate-400 text-sm mb-6">Both metrics on a single chart</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue (INR)" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
