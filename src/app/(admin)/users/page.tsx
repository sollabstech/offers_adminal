"use client";

import { useState } from "react";
import Image from "next/image";
import { Fragment } from "react";
import { Search, Ban, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";

export default function UsersPage() {
  const { users, orders, loading, updateUserStatus } = useAdminStore();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const getUserOrders = (userId: string) => orders.filter((o) => o.userId === userId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Users</h2>
          <p className="text-slate-400 text-sm">{users.length} registered users</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600">
            Active: <span className="font-bold text-emerald-600">{users.filter((u) => u.status === "active").length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600">
            Banned: <span className="font-bold text-red-500">{users.filter((u) => u.status === "banned").length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
      </div>

      {loading && users.length === 0 && <TableSkeleton rows={5} cols={8} />}
      {(!loading || users.length > 0) && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left text-slate-500 font-medium px-6 py-3">User</th>
              <th className="text-left text-slate-500 font-medium px-4 py-3">Phone</th>
              <th className="text-center text-slate-500 font-medium px-4 py-3">Orders</th>
              <th className="text-right text-slate-500 font-medium px-4 py-3">Total Spent</th>
              <th className="text-left text-slate-500 font-medium px-4 py-3">Joined</th>
              <th className="text-left text-slate-500 font-medium px-4 py-3">Last Login</th>
              <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
              <th className="text-center text-slate-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((user) => {
              const isExpanded = expanded === user.id;
              const userOrders = getUserOrders(user.id);
              return (
                <Fragment key={user.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Image src={user.avatar} alt={user.name} width={36} height={36} className="rounded-full" unoptimized />
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-xs">{user.phone}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-700">{user.ordersCount}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-800">
                      ₹{user.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{user.joinedAt}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{user.lastLoginAt}</td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => void updateUserStatus(user.id, user.status === "active" ? "banned" : "active")}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                            user.status === "active"
                              ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={user.status === "active" ? "Ban user" : "Unban user"}
                        >
                          {user.status === "active" ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : user.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View orders"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                          Order History ({userOrders.length} orders)
                        </p>
                        {userOrders.length === 0 ? (
                          <p className="text-slate-400 text-sm">No orders yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {userOrders.map((order) => (
                              <div key={order.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                                <div>
                                  <p className="font-mono text-xs text-slate-600">{order.id}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{order.items.length} item(s) · {order.createdAt}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="font-semibold text-slate-800">₹{order.total.toLocaleString()}</p>
                                  <StatusBadge status={order.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {user.address && (
                          <p className="text-xs text-slate-400 mt-3">📍 {user.address}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
