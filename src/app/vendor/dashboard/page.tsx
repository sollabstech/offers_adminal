"use client";

import { useAdminStore } from "@/store/adminStore";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Package, ShoppingCart, DollarSign, Clock, TrendingUp, BarChart2 } from "lucide-react";

export default function VendorDashboardPage() {
  const { products, orders, vendors, vendorId } = useAdminStore();
  const vendor = vendors.find((v) => v.id === vendorId);

  const myProducts = products.filter((p) => p.vendorId === vendorId);
  const myProductIds = new Set(myProducts.map((p) => p.id));

  const myOrders = orders.filter((o) =>
    o.items.some((item) => myProductIds.has(item.productId))
  );
  const pendingOrders = myOrders.filter((o) => o.status === "pending").length;
  const totalSold = myProducts.reduce((s, p) => s + p.sold, 0);

  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => {
      const items = o.items.filter((item) => myProductIds.has(item.productId));
      return sum + items.reduce((s, item) => s + item.price * item.quantity, 0);
    }, 0);

  const topProducts = [...myProducts].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const recentOrders = [...myOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
        <p className="text-orange-100 text-sm font-medium mb-1">Welcome back,</p>
        <h2 className="text-2xl font-bold">{vendor?.name ?? "Vendor"}</h2>
        <p className="text-orange-100 text-sm mt-0.5">
          {vendor?.company}{vendor?.category ? ` · ${vendor.category}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="My Products" value={myProducts.length.toString()} icon={Package} color="orange" />
        <StatCard title="Active" value={myProducts.filter((p) => p.status === "active").length.toString()} icon={TrendingUp} color="green" />
        <StatCard title="Total Orders" value={myOrders.length.toString()} icon={ShoppingCart} color="blue" />
        <StatCard title="Pending" value={pendingOrders.toString()} icon={Clock} color="red" />
        <StatCard title="Products Sold" value={totalSold.toLocaleString()} icon={BarChart2} color="purple" />
        <StatCard title="Revenue" value={`₹${(revenue / 1000).toFixed(1)}K`} icon={DollarSign} color="orange" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No orders for your products yet.</p>
          ) : (
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
                      <td className="py-3 text-right font-semibold text-slate-800">
                        ₹{order.total.toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">My Top Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No products yet.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400">
                      {product.sold} sold · ₹{product.price.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    ₹{(product.sold * product.price / 1000).toFixed(1)}K
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
