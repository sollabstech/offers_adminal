import type { PromotionBid } from "@/types";

export const DURATION_OPTIONS = [7, 15, 30] as const;
export const MIN_BID = 100;
export const MAX_POSITION = 10;

export type BidDisplayStatus = "pending" | "live" | "expired" | "rejected" | "withdrawn" | "ended";

export function isLive(bid: PromotionBid, now = Date.now()): boolean {
  return bid.status === "approved" && !!bid.endsAt && new Date(bid.endsAt).getTime() > now;
}

export function displayStatus(bid: PromotionBid, now = Date.now()): BidDisplayStatus {
  if (bid.status === "approved") return isLive(bid, now) ? "live" : "expired";
  return bid.status;
}

export const STATUS_STYLE: Record<BidDisplayStatus, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  live: { label: "Live", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  expired: { label: "Expired", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 ring-red-200" },
  withdrawn: { label: "Withdrawn", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  ended: { label: "Ended", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};

/** 1-based position of `bid` among open (pending or live) bids in its category, highest amount first. */
export function positionInCategory(bid: PromotionBid, all: PromotionBid[], now = Date.now()): { position: number; total: number } {
  const open = all
    .filter((b) => b.category === bid.category && (b.status === "pending" || isLive(b, now)))
    .sort((a, b) => b.amount - a.amount || a.createdAt.localeCompare(b.createdAt));
  return { position: open.findIndex((b) => b.id === bid.id) + 1, total: open.length };
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
