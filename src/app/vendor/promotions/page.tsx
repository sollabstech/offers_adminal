"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Megaphone, TrendingUp, Loader2, Info, Trophy } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import * as db from "@/lib/db";
import {
  DURATION_OPTIONS, MIN_BID, STATUS_STYLE, displayStatus, positionInCategory, formatDate, inr,
} from "@/lib/promotions";
import type { PromotionBid } from "@/types";

export default function VendorPromotionsPage() {
  const { products, promotionBids, vendorId } = useAdminStore();

  const myProducts = useMemo(
    () => products.filter((p) => p.vendorId === vendorId && p.status === "active"),
    [products, vendorId]
  );
  const myBids = useMemo(() => promotionBids.filter((b) => b.vendorId === vendorId), [promotionBids, vendorId]);

  const [productId, setProductId] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState<number>(7);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const product = myProducts.find((p) => p.id === productId);
  const pendingForProduct = myBids.find((b) => b.productId === productId && b.status === "pending");
  const liveForProduct = myBids.find((b) => b.productId === productId && displayStatus(b) === "live");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const value = Math.round(Number(amount));
    if (!product) return setMessage({ type: "error", text: "Choose a product to promote." });
    if (!Number.isFinite(value) || value < MIN_BID) {
      return setMessage({ type: "error", text: `Minimum bid is ${inr(MIN_BID)}.` });
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const bid: PromotionBid = {
        id: pendingForProduct?.id ?? `bid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] ?? "",
        category: product.category,
        vendorId,
        vendorName: product.vendorName,
        amount: value,
        days,
        status: "pending",
        createdAt: pendingForProduct?.createdAt ?? now,
        updatedAt: now,
      };
      if (note.trim()) bid.note = note.trim().slice(0, 200);
      await db.savePromotionBid(bid);
      setMessage({
        type: "ok",
        text: pendingForProduct ? "Your bid was updated and sent to the admin." : "Bid submitted! The admin will review it shortly.",
      });
      setAmount("");
      setNote("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Could not submit bid." });
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (bid: PromotionBid) => {
    if (!confirm(`Withdraw your ${inr(bid.amount)} bid for "${bid.productName}"?`)) return;
    setWithdrawing(bid.id);
    try {
      await db.setPromotionBidStatus(bid.id, "withdrawn");
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Promote Your Products</h2>
        <p className="text-slate-400 text-sm">Bid to show your product first in its category on Offerss.com</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Bid form */}
        <form onSubmit={submit} className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Megaphone size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Place a bid</p>
              <p className="text-xs text-slate-400">Higher bids get the top spots — the admin makes the final call.</p>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Product *</span>
            <select
              required
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setMessage(null); }}
              className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            >
              <option value="">{myProducts.length ? "Select one of your products" : "You have no active products yet"}</option>
              {myProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.category}</option>
              ))}
            </select>
          </label>

          {pendingForProduct && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <Info size={13} className="shrink-0 mt-0.5" />
              You already have a pending bid of {inr(pendingForProduct.amount)} for this product. Submitting will update it.
            </p>
          )}
          {liveForProduct && (
            <p className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <Info size={13} className="shrink-0 mt-0.5" />
              This product is already promoted until {formatDate(liveForProduct.endsAt)}. A new bid will start fresh if approved.
            </p>
          )}

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Bid amount (₹) *</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input
                required
                type="number"
                inputMode="numeric"
                min={MIN_BID}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <span className="text-[11px] text-slate-400">Minimum {inr(MIN_BID)}. Paid to Offerss.com only if your bid is approved.</span>
          </label>

          <div>
            <span className="text-xs font-medium text-slate-600">Promotion duration *</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    days === d ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Note to admin <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="e.g. Festive sale — would like the #1 spot in Electronics"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </label>

          {message && (
            <p className={`text-xs rounded-lg px-3 py-2 border ${message.type === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !myProducts.length}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
            {saving ? "Submitting…" : pendingForProduct ? "Update Bid" : "Submit Bid"}
          </button>
        </form>

        {/* How it works */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-5 text-white space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-orange-400" />
            <p className="font-semibold text-sm">How promotion works</p>
          </div>
          <ol className="space-y-3 text-sm text-slate-300">
            {[
              "Pick a product and bid what a top spot is worth to you.",
              "Bids in each category are ranked highest first — you'll see your position, not other vendors' amounts.",
              "The admin approves bids and assigns positions (#1 shows first).",
              "Approved products appear first in their category with a “Sponsored” tag for the chosen duration.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 shrink-0 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* My bids */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">My Bids</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-slate-500 font-medium px-5 py-3">Product</th>
                <th className="text-right text-slate-500 font-medium px-4 py-3">Bid</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Duration</th>
                <th className="text-center text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Ranking</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3">Dates</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myBids.map((bid) => {
                const status = displayStatus(bid);
                const { position, total } = positionInCategory(bid, promotionBids);
                return (
                  <tr key={bid.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {bid.productImage ? (
                          <Image src={bid.productImage} alt="" width={36} height={36} className="rounded-lg object-cover w-9 h-9" unoptimized />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate max-w-56">{bid.productName}</p>
                          <p className="text-xs text-slate-400">{bid.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{inr(bid.amount)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{bid.days} days</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_STYLE[status].cls}`}>
                        {STATUS_STYLE[status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {status === "live" && bid.rank ? (
                        <span className="font-semibold text-emerald-700">Position #{bid.rank} on site</span>
                      ) : status === "pending" && position > 0 ? (
                        <span>#{position} of {total} bids in {bid.category}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {status === "live" || status === "expired" ? (
                        <>{formatDate(bid.startsAt)} → {formatDate(bid.endsAt)}</>
                      ) : (
                        <>Submitted {formatDate(bid.createdAt)}</>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === "pending" && (
                        <button
                          type="button"
                          onClick={() => withdraw(bid)}
                          disabled={withdrawing === bid.id}
                          className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {withdrawing === bid.id ? "Withdrawing…" : "Withdraw"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {myBids.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No bids yet — place your first bid above to get your product seen first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
