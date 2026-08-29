"use client";

import { useState } from "react";
import Image from "next/image";
import { Fragment } from "react";
import { Search, ChevronDown, ChevronUp, Download, FileText, Table2 } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import StatusBadge from "@/components/StatusBadge";
import TableSkeleton from "@/components/TableSkeleton";
import type { Order } from "@/types";

const STATUS_OPTIONS: Order["status"][] = [
  "pending", "processing", "shipped", "delivered", "cancelled",
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function OrdersPage() {
  const { orders, loading, updateOrderStatus } = useAdminStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDownload, setShowDownload] = useState(false);

  const filtered = orders
    .filter((o) => {
      const matchSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.userName.toLowerCase().includes(search.toLowerCase()) ||
        o.userEmail.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const filterLabel = statusFilter === "all" ? "All" : cap(statusFilter);
  const grandTotal = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? grandTotal / filtered.length : 0;

  // ── PDF export ──────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    setShowDownload(false);
    const now = new Date().toLocaleString("en-IN");
    const rows = filtered.map((o) => `
      <tr>
        <td>${o.id}</td>
        <td>${o.userName}<br/><span class="sub">${o.userEmail}</span></td>
        <td>${o.shippingAddress}</td>
        <td>${o.items.map((i) => `${i.productName} ×${i.quantity}`).join("<br/>")}</td>
        <td class="num">${o.items.reduce((s, i) => s + i.quantity, 0)}</td>
        <td class="num">₹${o.total.toLocaleString("en-IN")}</td>
        <td>${cap(o.paymentMethod)}</td>
        <td><span class="badge badge-${o.status}">${cap(o.status)}</span></td>
        <td>${o.createdAt.slice(0, 10)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>Orders Report — ${filterLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:24px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0d1b3e}
  .brand{font-size:22px;font-weight:700;color:#0d1b3e}.brand span{color:#ff6600}
  .meta{text-align:right;font-size:10px;color:#64748b}
  .cards{display:flex;gap:12px;margin-bottom:20px}
  .card{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
  .card-val{font-size:18px;font-weight:700;color:#0d1b3e;margin-bottom:2px}
  .card-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0d1b3e;color:#fff}
  th{padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  tbody tr:nth-child(even){background:#f8fafc}
  tbody tr:hover{background:#eff6ff}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  td.num{text-align:right;font-weight:600}
  .sub{color:#64748b;font-size:10px}
  .badge{padding:2px 8px;border-radius:20px;font-size:9px;font-weight:600;text-transform:uppercase}
  .badge-pending{background:#fef3c7;color:#92400e}
  .badge-processing{background:#dbeafe;color:#1e40af}
  .badge-shipped{background:#ede9fe;color:#5b21b6}
  .badge-delivered{background:#d1fae5;color:#065f46}
  .badge-cancelled{background:#fee2e2;color:#991b1b}
  tfoot td{padding:8px 10px;font-weight:700;font-size:12px;background:#0d1b3e;color:#fff;border-top:2px solid #ff6600}
  tfoot td.num{text-align:right}
  @media print{body{padding:0}@page{size:A4 landscape;margin:12mm}}
</style></head><body>
<div class="header">
  <div><div class="brand"><span>Off</span>erss.com</div><div style="font-size:13px;font-weight:600;color:#ff6600;margin-top:4px">Orders Report — ${filterLabel}</div></div>
  <div class="meta"><div>Generated: ${now}</div><div>${filtered.length} order${filtered.length !== 1 ? "s" : ""} exported</div></div>
</div>
<div class="cards">
  <div class="card"><div class="card-val">${filtered.length}</div><div class="card-lbl">Total Orders</div></div>
  <div class="card"><div class="card-val">₹${grandTotal.toLocaleString("en-IN")}</div><div class="card-lbl">Total Revenue</div></div>
  <div class="card"><div class="card-val">₹${Math.round(avgOrder).toLocaleString("en-IN")}</div><div class="card-lbl">Avg. Order Value</div></div>
  <div class="card"><div class="card-val">${filterLabel}</div><div class="card-lbl">Filter</div></div>
</div>
<table>
  <thead><tr>
    <th>Order ID</th><th>Customer</th><th>Address</th><th>Products</th>
    <th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">No orders</td></tr>'}</tbody>
  <tfoot><tr>
    <td colspan="4" style="text-align:right">Grand Total (${filtered.length} orders)</td>
    <td class="num">${filtered.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0)}</td>
    <td class="num">₹${grandTotal.toLocaleString("en-IN")}</td>
    <td colspan="3"></td>
  </tr></tfoot>
</table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    setShowDownload(false);
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Order ID","Customer","Email","Address","Products","Total Items","Amount (₹)","Payment","Status","Date"];
    const rowsData = filtered.map((o) => [
      o.id,
      o.userName,
      o.userEmail,
      o.shippingAddress,
      o.items.map((i) => `${i.productName} x${i.quantity}`).join(" | "),
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.total,
      cap(o.paymentMethod),
      cap(o.status),
      o.createdAt.slice(0, 10),
    ]);
    const csv = "﻿" + [header, ...rowsData].map((r) => r.map(escape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${filterLabel.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Orders</h2>
          <p className="text-slate-400 text-sm">{orders.length} total orders</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600">
          Delivered revenue: <span className="font-bold text-emerald-600">₹{totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
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

        {/* Download button + dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowDownload((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-orange-200"
          >
            <Download size={14} />
            <span>Download {filterLabel} ({filtered.length})</span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${showDownload ? "rotate-180" : ""}`} />
          </button>

          {showDownload && (
            <>
              {/* backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setShowDownload(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={downloadPDF}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <FileText size={15} className="text-orange-400 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">Download PDF</div>
                    <div className="text-xs text-slate-400">Print-ready report</div>
                  </div>
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={downloadCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                  <Table2 size={15} className="text-green-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">Download Excel</div>
                    <div className="text-xs text-slate-400">CSV file (.csv)</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {loading && orders.length === 0 && <TableSkeleton rows={5} cols={9} />}
      {(!loading || orders.length > 0) && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-slate-500 font-medium px-6 py-3">Order ID</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Customer</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Items</th>
                <th className="text-right text-slate-500 font-medium px-4 py-3">Total</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Payment</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Date</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Update</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((order) => {
                const isExpanded = expanded === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{order.id}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{order.userName}</p>
                        <p className="text-xs text-slate-400">{order.userEmail}</p>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-600">{order.items.length}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-800">₹{order.total.toLocaleString()}</td>
                      <td className="px-4 py-4 text-slate-500 text-xs">{order.paymentMethod}</td>
                      <td className="px-4 py-4 text-slate-500 text-xs">{order.createdAt}</td>
                      <td className="px-4 py-4 text-center"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-4 text-center">
                        <select
                          value={order.status}
                          onChange={(e) => void updateOrderStatus(order.id, e.target.value as Order["status"])}
                          className="text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
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
                        <td colSpan={9} className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Order Items</p>
                              <div className="space-y-2">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                    <Image src={item.productImage} alt={item.productName} width={40} height={40} className="rounded-lg" unoptimized />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-700 truncate">{item.productName}</p>
                                      <p className="text-xs text-slate-400">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                                    </div>
                                    <p className="font-semibold text-slate-800 text-sm">₹{(item.quantity * item.price).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Shipping Info</p>
                              <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Address</span>
                                  <span className="text-slate-700 font-medium">{order.shippingAddress}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Payment</span>
                                  <span className="text-slate-700 font-medium">{order.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Created</span>
                                  <span className="text-slate-700">{order.createdAt}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Updated</span>
                                  <span className="text-slate-700">{order.updatedAt}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-100">
                                  <span className="text-slate-700">Total</span>
                                  <span className="text-slate-800">₹{order.total.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
