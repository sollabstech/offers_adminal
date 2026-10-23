"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, X, Loader2, Megaphone, Clock3, IndianRupee, Radio, StopCircle, MessageSquare } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import * as db from "@/lib/db";
import { MAX_POSITION, STATUS_STYLE, displayStatus, isLive, formatDate, inr } from "@/lib/promotions";
import type { PromotionBid } from "@/types";

type Tab = "pending" | "live" | "history";

function groupByCategory(bids: PromotionBid[]) {
  const map = new Map<string, PromotionBid[]>();
  bids.forEach((b) => map.set(b.category, [...(map.get(b.category) ?? []), b]));
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function daysLeft(endsAt?: string) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

export default function PromotionsPage() {
  const { promotionBids, products } = useAdminStore();
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [positions, setPositions] = useState<Record<string, number>>({});

  const pending = useMemo(() => promotionBids.filter((b) => b.status === "pending"), [promotionBids]);
  const live = useMemo(() => promotionBids.filter((b) => isLive(b)), [promotionBids]);
  const history = useMemo(
    () => promotionBids.filter((b) => b.status !== "pending" && !isLive(b)),
    [promotionBids]
  );

  const liveByCategory = (category: string) =>
    live.filter((b) => b.category === category).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const nextFreePosition = (category: string) => {
    const taken = new Set(liveByCategory(category).map((b) => b.rank));
    for (let i = 1; i <= MAX_POSITION; i++) if (!taken.has(i)) return i;
    return MAX_POSITION;
  };

  const productExists = (id: string) => products.some((p) => p.id === id);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const approve = (bid: PromotionBid) => {
    const rank = positions[bid.id] ?? nextFreePosition(bid.category);
    const replaced = live.find((b) => b.productId === bid.productId && b.id !== bid.id);
    return run(bid.id, () => db.approvePromotionBid(bid, rank, replaced?.id));
  };

  const reject = (bid: PromotionBid) => {
    if (!confirm(`Reject ${bid.vendorName}'s ${inr(bid.amount)} bid for "${bid.productName}"?`)) return;
    return run(bid.id, () => db.setPromotionBidStatus(bid.id, "rejected"));
  };

  const end = (bid: PromotionBid) => {
    if (!confirm(`End the promotion for "${bid.productName}" now?`)) return;
    const product = products.find((p) => p.id === bid.productId);
    return run(bid.id, () => db.endPromotion(bid, product?.promotionBidId === bid.id));
  };

  const changeRank = (bid: PromotionBid, rank: number) => run(bid.id, () => db.setPromotionRank(bid, rank));

  const positionOptions = (category: string, selfId?: string) => {
    const takenBy = new Map(liveByCategory(category).filter((b) => b.id !== selfId).map((b) => [b.rank, b.vendorName]));
    return Array.from({ length: MAX_POSITION }, (_, i) => i + 1).map((n) => (
      <option key={n} value={n}>
        #{n}{takenBy.has(n) ? ` (taken: ${takenBy.get(n)})` : ""}
      </option>
    ));
  };

  const liveRevenue = live.reduce((s, b) => s + b.amount, 0);
  const pendingValue = pending.reduce((s, b) => s + b.amount, 0);

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending Bids", count: pending.length },
    { id: "live", label: "Live", count: live.length },
    { id: "history", label: "History", count: history.length },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Promotions</h2>
        <p className="text-slate-400 text-sm">Vendors bid for top placement — you decide who shows first in each category</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending bids", value: pending.length, icon: Clock3, cls: "text-amber-600 bg-amber-50" },
          { label: "Pending value", value: inr(pendingValue), icon: IndianRupee, cls: "text-slate-600 bg-slate-100" },
          { label: "Live promotions", value: live.length, icon: Radio, cls: "text-emerald-600 bg-emerald-50" },
          { label: "Live bid revenue", value: inr(liveRevenue), icon: Megaphone, cls: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs ${tab === t.id ? "text-white/80" : "text-slate-400"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}

      {tab === "pending" && (
        pending.length === 0 ? (
          <Empty text="No pending bids. Vendors place bids from their panel under “Promote”." />
        ) : (
          groupByCategory(pending).map(([category, bids]) => {
            const sorted = [...bids].sort((a, b) => b.amount - a.amount || a.createdAt.localeCompare(b.createdAt));
            const liveCount = liveByCategory(category).length;
            return (
              <section key={category} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                  <p className="font-semibold text-slate-800 text-sm">{category}</p>
                  <p className="text-xs text-slate-400">{sorted.length} bid{sorted.length === 1 ? "" : "s"} &middot; {liveCount} live now</p>
                </header>
                <ul className="divide-y divide-slate-50">
                  {sorted.map((bid, i) => {
                    const exists = productExists(bid.productId);
                    const position = positions[bid.id] ?? nextFreePosition(category);
                    return (
                      <li key={bid.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          #{i + 1}
                        </span>
                        <ProductCell bid={bid} />
                        <div className="text-right min-w-24">
                          <p className="font-bold text-slate-800">{inr(bid.amount)}</p>
                          <p className="text-xs text-slate-400">{bid.days} days &middot; {formatDate(bid.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          {exists ? (
                            <>
                              <select
                                value={position}
                                onChange={(e) => setPositions((p) => ({ ...p, [bid.id]: Number(e.target.value) }))}
                                aria-label="Position on site"
                                className="text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400"
                              >
                                {positionOptions(category)}
                              </select>
                              <button
                                onClick={() => approve(bid)}
                                disabled={busy !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                              >
                                {busy === bid.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-red-500">Product was deleted</span>
                          )}
                          <button
                            onClick={() => reject(bid)}
                            disabled={busy !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 disabled:opacity-50 text-slate-600 text-xs font-semibold rounded-lg"
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                        {bid.note && (
                          <p className="basis-full flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 ml-12">
                            <MessageSquare size={12} className="shrink-0 mt-0.5" /> {bid.note}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )
      )}

      {tab === "live" && (
        live.length === 0 ? (
          <Empty text="No live promotions. Approve a pending bid to feature a product." />
        ) : (
          groupByCategory(live).map(([category]) => (
            <section key={category} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <header className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="font-semibold text-slate-800 text-sm">{category}</p>
              </header>
              <ul className="divide-y divide-slate-50">
                {liveByCategory(category).map((bid) => (
                  <li key={bid.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <select
                      value={bid.rank ?? 1}
                      onChange={(e) => changeRank(bid, Number(e.target.value))}
                      disabled={busy !== null || !productExists(bid.productId)}
                      aria-label="Position on site"
                      className="text-xs font-semibold px-2 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg focus:outline-none"
                    >
                      {positionOptions(category, bid.id)}
                    </select>
                    <ProductCell bid={bid} />
                    <div className="text-right min-w-24">
                      <p className="font-bold text-slate-800">{inr(bid.amount)}</p>
                      <p className="text-xs text-slate-400">ends {formatDate(bid.endsAt)} &middot; {daysLeft(bid.endsAt)}d left</p>
                    </div>
                    <button
                      onClick={() => end(bid)}
                      disabled={busy !== null}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 disabled:opacity-50 text-slate-600 text-xs font-semibold rounded-lg"
                    >
                      {busy === bid.id ? <Loader2 size={13} className="animate-spin" /> : <StopCircle size={13} />} End now
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      )}

      {tab === "history" && (
        history.length === 0 ? (
          <Empty text="No past bids yet." />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left text-slate-500 font-medium px-5 py-3">Product</th>
                    <th className="text-left text-slate-500 font-medium px-4 py-3">Category</th>
                    <th className="text-right text-slate-500 font-medium px-4 py-3">Bid</th>
                    <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                    <th className="text-left text-slate-500 font-medium px-4 py-3">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((bid) => {
                    const s = displayStatus(bid);
                    return (
                      <tr key={bid.id}>
                        <td className="px-5 py-3"><ProductCell bid={bid} /></td>
                        <td className="px-4 py-3 text-slate-600">{bid.category}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(bid.amount)} <span className="font-normal text-xs text-slate-400">/ {bid.days}d</span></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_STYLE[s].cls}`}>{STATUS_STYLE[s].label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {bid.startsAt ? <>{formatDate(bid.startsAt)} → {formatDate(bid.endsAt)}</> : <>Submitted {formatDate(bid.createdAt)}</>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ProductCell({ bid }: { bid: PromotionBid }) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {bid.productImage ? (
        <Image src={bid.productImage} alt="" width={40} height={40} className="rounded-lg object-cover w-10 h-10 shrink-0" unoptimized />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-medium text-slate-800 truncate">{bid.productName}</p>
        <p className="text-xs text-slate-400 truncate">{bid.vendorName}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
      <Megaphone size={28} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
