"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import type { ReturnRequest } from "@/types";

const STATUS_STYLES: Record<ReturnRequest["status"], string> = {
  pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const TABS: { label: string; value: ReturnRequest["status"] | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function ReturnsPage() {
  const { returns, updateReturnStatus } = useAdminStore();
  const [tab, setTab] = useState<ReturnRequest["status"] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = tab === "all" ? returns : returns.filter((r) => r.status === tab);
  const pendingCount = returns.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Returns & Replacements</h2>
          <p className="text-slate-400 text-sm">{returns.length} total requests</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-sm text-yellow-700 font-medium">
            <RotateCcw size={15} />
            {pendingCount} pending review
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300"
            }`}
          >
            {t.label}
            {t.value === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-3">
          <RotateCcw size={28} className="text-slate-300" />
          <p className="text-slate-400 text-sm">No {tab === "all" ? "" : tab} return requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  {/* Product image */}
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    {r.productImage ? (
                      <Image src={r.productImage} alt={r.productName} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">N/A</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{r.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.userName} · {r.userEmail}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border capitalize ${
                    r.type === "replace" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-orange-50 text-orange-600 border-orange-200"
                  }`}>
                    {r.type}
                  </span>

                  {/* Status badge */}
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border capitalize ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>

                  {/* Order ref */}
                  <p className="shrink-0 hidden md:block text-xs font-mono text-slate-400">{r.orderId}</p>

                  {/* Date */}
                  <p className="shrink-0 hidden lg:block text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <span className="text-slate-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Return Reason</p>
                        <p className="text-sm font-medium text-slate-700">{r.reason}</p>
                        {r.details && (
                          <p className="mt-2 text-sm text-slate-500 bg-white rounded-lg border border-slate-200 p-3">{r.details}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Order Details</p>
                        <p className="text-sm text-slate-600">Order ID: <span className="font-mono">{r.orderId}</span></p>
                        <p className="text-sm text-slate-600 mt-1">Request type: <span className="font-medium capitalize">{r.type}</span></p>
                        <p className="text-sm text-slate-600 mt-1">Submitted: {new Date(r.createdAt).toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {r.status === "pending" && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => void updateReturnStatus(r.id, "approved")}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                        >
                          <CheckCircle size={15} /> Approve
                        </button>
                        <button
                          onClick={() => void updateReturnStatus(r.id, "rejected")}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
