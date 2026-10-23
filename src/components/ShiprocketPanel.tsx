"use client";

import { useMemo, useState } from "react";
import { Truck, ExternalLink, Loader2, XCircle, RefreshCw, Zap, Clock3, IndianRupee, MapPin, PackageCheck, AlertTriangle, PackageOpen, Pencil, Rocket } from "lucide-react";
import type { Order, OrderShipment, Product, ShippingMethod } from "@/types";

const PLATFORM_VENDOR_ID = "__offerss__";

type Audience = "admin" | "vendor";

interface VendorGroup {
  vendorId: string;
  vendorName: string;
  itemCount: number;
}

interface Courier {
  courierId: number;
  name: string;
  etd: string;
  codAvailable: boolean;
  speedTier: "express" | "fast" | "standard";
  shiprocketRate: number;
  marginType: "fixed" | "percentage";
  marginValue: number;
  marginAmount: number;
  codCharge: number;
  finalCharge: number;
}

const TIER_STYLE: Record<Courier["speedTier"], { label: string; className: string }> = {
  express: { label: "Express", className: "bg-emerald-100 text-emerald-700" },
  fast: { label: "Fast", className: "bg-blue-100 text-blue-700" },
  standard: { label: "Standard", className: "bg-slate-100 text-slate-600" },
};

function formatETD(etd: string) {
  try {
    return new Date(etd).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return etd;
  }
}

/**
 * Full Shiprocket fulfillment UI for one order — one card per vendor whose
 * products are in the order (an order can span several vendors, each
 * shipped separately from their own pickup location). Relies on the
 * parent's Firestore onSnapshot listener (adminStore) to refresh `order`
 * after a successful call.
 */
export default function ShiprocketPanel({
  order,
  products,
  onlyVendorId,
  audience = "admin",
}: {
  order: Order;
  products: Product[];
  /** Vendor panel: show only this vendor's shipment card. */
  onlyVendorId?: string;
  /** "vendor" hides the Shiprocket-rate vs. commission breakdown, which is admin-only. */
  audience?: Audience;
}) {
  const groups = useMemo<VendorGroup[]>(() => {
    const byVendor = new Map<string, VendorGroup>();
    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      const vendorId = product?.vendorId || PLATFORM_VENDOR_ID;
      const vendorName = product?.vendorName || (vendorId === PLATFORM_VENDOR_ID ? "Offerss.com" : vendorId);
      const g = byVendor.get(vendorId) ?? { vendorId, vendorName, itemCount: 0 };
      g.itemCount += item.quantity;
      byVendor.set(vendorId, g);
    });
    const all = [...byVendor.values()];
    return onlyVendorId ? all.filter((g) => g.vendorId === onlyVendorId) : all;
  }, [order.items, products, onlyVendorId]);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <VendorShipmentCard
          key={g.vendorId}
          orderId={order.id}
          group={g}
          shipment={order.shipments?.find((s) => s.vendorId === g.vendorId)}
          audience={audience}
        />
      ))}
    </div>
  );
}

function VendorShipmentCard({
  orderId,
  group,
  shipment,
  audience,
}: {
  orderId: string;
  group: VendorGroup;
  shipment?: OrderShipment;
  audience: Audience;
}) {
  const isAdmin = audience === "admin";
  const [busy, setBusy] = useState<"couriers" | "ship" | "cancel" | "track" | "pickup" | "self" | null>(null);
  const [method, setMethod] = useState<ShippingMethod>("shiprocket");
  const [editingSelf, setEditingSelf] = useState(false);
  const [selfCourier, setSelfCourier] = useState("");
  const [selfTrackingId, setSelfTrackingId] = useState("");
  const [selfTrackingUrl, setSelfTrackingUrl] = useState("");
  const [error, setError] = useState("");
  const [couriers, setCouriers] = useState<Courier[] | null>(null);
  const [trackResult, setTrackResult] = useState<{ status: string; location: string } | null>(null);
  const [estimatedPackage, setEstimatedPackage] = useState(false);
  const [pickupRequested, setPickupRequested] = useState(false);
  const [pickupRequestedAt, setPickupRequestedAt] = useState<string | undefined>(undefined);

  const loadCouriers = async () => {
    setBusy("couriers");
    setError("");
    try {
      const res = await fetch(`/api/shiprocket/couriers?orderId=${encodeURIComponent(orderId)}&vendorId=${encodeURIComponent(group.vendorId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch courier options");
      setEstimatedPackage(!!data.usedEstimatedPackage);
      if ((data.couriers ?? []).length === 0) {
        setError("No couriers currently serviceable for this pincode.");
      } else {
        setCouriers(data.couriers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch courier options");
    } finally {
      setBusy(null);
    }
  };

  const ship = async (courier: Courier) => {
    setBusy("ship");
    setError("");
    try {
      const res = await fetch("/api/shiprocket/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          vendorId: group.vendorId,
          courierId: courier.courierId,
          shiprocketRate: courier.shiprocketRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to ship order");
      setCouriers(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ship order");
    } finally {
      setBusy(null);
    }
  };

  const refreshTracking = async () => {
    setBusy("track");
    setError("");
    setTrackResult(null);
    try {
      const res = await fetch("/api/shiprocket/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, vendorId: group.vendorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to refresh tracking");
      setTrackResult({ status: data.status, location: data.location });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh tracking");
    } finally {
      setBusy(null);
    }
  };

  const startEditSelf = () => {
    setSelfCourier(shipment?.courierName ?? "");
    setSelfTrackingId(shipment?.awbCode ?? "");
    setSelfTrackingUrl(shipment?.trackingUrl ?? "");
    setError("");
    setEditingSelf(true);
  };

  const saveSelfCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("self");
    setError("");
    try {
      const res = await fetch("/api/shipments/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          vendorId: group.vendorId,
          courierName: selfCourier,
          trackingId: selfTrackingId,
          trackingUrl: selfTrackingUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save courier details");
      setEditingSelf(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save courier details");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    const label = shipment?.shippingMethod === "self" ? "self-ship" : "Shiprocket";
    if (!confirm(isAdmin ? `Cancel ${group.vendorName}'s ${label} shipment?` : `Cancel this ${label} shipment?`)) return;
    setBusy("cancel");
    setError("");
    try {
      const res = await fetch("/api/shiprocket/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, vendorId: group.vendorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel shipment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel shipment");
    } finally {
      setBusy(null);
    }
  };

  const requestPickup = async () => {
    setBusy("pickup");
    setError("");
    try {
      const res = await fetch("/api/shiprocket/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, vendorId: group.vendorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to request pickup");
      setPickupRequested(true);
      setPickupRequestedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request pickup");
    } finally {
      setBusy(null);
    }
  };

  const isSelf = shipment?.shippingMethod === "self";
  const selfShipped = isSelf && shipment?.status === "shipped";
  const shipped = !isSelf && shipment?.status === "shipped" && shipment.awbCode;
  const cancelled = shipment?.status === "cancelled";
  const showSelfForm = editingSelf || (!selfShipped && !shipped && !cancelled && !couriers && method === "self");
  const pickupDone = pickupRequested || !!shipment?.pickupRequested;
  const pickupDoneAt = pickupRequestedAt ?? shipment?.pickupRequestedAt;
  const showEstimatedWarning = estimatedPackage || !!shipment?.usedEstimatedPackage;

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Truck size={13} /> {group.vendorName} <span className="text-slate-300 font-normal normal-case">&middot; {group.itemCount} item{group.itemCount === 1 ? "" : "s"}</span>
        </p>
      </div>

      {showEstimatedWarning && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={12} className="shrink-0" /> Weight/dimensions estimated — one or more products are missing real weight or size. Update the product for accurate rates.
        </p>
      )}

      {!selfShipped && !shipped && !cancelled && !couriers && !editingSelf && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Shipping method">
          {([
            { id: "shiprocket", label: isAdmin ? "Shiprocket" : "Offerss Ship", icon: Rocket },
            { id: "self", label: isAdmin ? "Self Courier" : "Self Ship", icon: PackageOpen },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={method === id}
              onClick={() => { setMethod(id); setError(""); }}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                method === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}
      {!isAdmin && !selfShipped && !shipped && !cancelled && !couriers && !editingSelf && (
        <p className="text-[11px] text-slate-400">
          {method === "self"
            ? "You book the courier yourself and enter its tracking details — the customer sees them on their order."
            : "Offerss books a Shiprocket courier to pick up from your registered pickup address."}
        </p>
      )}

      {showSelfForm ? (
        <form onSubmit={saveSelfCourier} className="space-y-2">
          {editingSelf && <p className="text-xs font-medium text-slate-500">Edit self-courier details</p>}
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Courier company name *</span>
            <input
              required
              maxLength={80}
              value={selfCourier}
              onChange={(e) => setSelfCourier(e.target.value)}
              placeholder="e.g. DTDC, Blue Dart, India Post"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Tracking ID / AWB number *</span>
            <input
              required
              maxLength={60}
              value={selfTrackingId}
              onChange={(e) => setSelfTrackingId(e.target.value)}
              placeholder="e.g. D12345678"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-orange-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Tracking link <span className="font-normal text-slate-400">(optional)</span></span>
            <input
              type="url"
              value={selfTrackingUrl}
              onChange={(e) => setSelfTrackingUrl(e.target.value)}
              placeholder="https://www.dtdc.in/tracking"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </label>
          <p className="text-[11px] text-slate-400">The customer will see the courier name and tracking ID on their order page.</p>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {busy === "self" ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
              {busy === "self" ? "Saving…" : editingSelf ? "Save changes" : "Mark as Shipped"}
            </button>
            {editingSelf && (
              <button type="button" onClick={() => setEditingSelf(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : selfShipped ? (
        <div className="space-y-1.5 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            <PackageOpen size={10} /> {isAdmin ? "Self Courier" : "Self Ship"}
          </span>
          <Row label="Courier" value={shipment.courierName} />
          <Row label="Tracking ID" value={<span className="font-mono">{shipment.awbCode}</span>} />
          {shipment.shippedAt && (
            <Row label="Shipped on" value={new Date(shipment.shippedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
          )}
          {shipment.finalCharge != null && <Row label="Delivery charge collected" value={<Money v={shipment.finalCharge} bold />} />}
          <div className="flex items-center gap-3 pt-1">
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orange-500 hover:underline text-xs font-medium">
                Track page <ExternalLink size={11} />
              </a>
            )}
            <button type="button" onClick={startEditSelf} disabled={busy !== null} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50">
              <Pencil size={12} /> Edit
            </button>
            <button type="button" onClick={cancel} disabled={busy !== null} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50">
              {busy === "cancel" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Cancel
            </button>
          </div>
        </div>
      ) : shipped ? (
        <div className="space-y-1.5 text-sm">
          <Row label="Courier" value={shipment.courierName} />
          <Row label="AWB" value={<span className="font-mono">{shipment.awbCode}</span>} />
          <Row label="Pickup → Delivery" value={`${shipment.pickupPincode} → ${shipment.deliveryPincode}`} />
          <Row label="Weight / Dims" value={`${shipment.weight}kg · ${shipment.length}×${shipment.breadth}×${shipment.height}cm`} />
          {isAdmin ? (
            <div className="rounded-lg bg-slate-50 p-2.5 space-y-1 mt-1">
              <Row label="Shiprocket actual charge" value={<Money v={shipment.shiprocketRate} />} />
              <Row
                label={`Delivery commission${shipment.marginType === "percentage" ? ` (${shipment.marginValue}%)` : ""}`}
                value={<Money v={shipment.marginAmount} />}
              />
              {!!shipment.codCharge && <Row label="COD charge" value={<Money v={shipment.codCharge} />} />}
              <Row label="Final charge collected" value={<Money v={shipment.finalCharge} bold />} />
            </div>
          ) : (
            shipment.finalCharge != null && <Row label="Delivery charge" value={<Money v={shipment.finalCharge} bold />} />
          )}
          {(trackResult?.status || shipment.deliveryStatus) && (
            <Row
              label="Status"
              value={
                <span className="text-right">
                  {trackResult?.status ?? shipment.deliveryStatus}
                  {(trackResult?.location || shipment.lastLocation) && (
                    <span className="block text-xs text-slate-400">{trackResult?.location ?? shipment.lastLocation}</span>
                  )}
                </span>
              }
            />
          )}
          {pickupDone ? (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <PackageCheck size={12} /> Pickup requested
              {pickupDoneAt && <span className="text-slate-400 font-normal">&middot; {new Date(pickupDoneAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
            </p>
          ) : (
            <button
              type="button"
              onClick={requestPickup}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {busy === "pickup" ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
              {busy === "pickup" ? "Requesting pickup…" : "Request Pickup"}
            </button>
          )}
          <div className="flex items-center gap-3 pt-1">
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orange-500 hover:underline text-xs font-medium">
                Track page <ExternalLink size={11} />
              </a>
            )}
            <button type="button" onClick={refreshTracking} disabled={busy !== null} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50">
              {busy === "track" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh status
            </button>
            <button type="button" onClick={cancel} disabled={busy !== null} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50">
              {busy === "cancel" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Cancel
            </button>
          </div>
        </div>
      ) : cancelled ? (
        <p className="text-sm text-slate-400">Shipment cancelled.</p>
      ) : couriers ? (
        <div className="space-y-1.5">
          {couriers.map((c) => (
            <button
              key={c.courierId}
              type="button"
              onClick={() => ship(c)}
              disabled={busy !== null}
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-orange-300 hover:bg-orange-50/50 transition-colors disabled:opacity-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TIER_STYLE[c.speedTier].className}`}>
                    <Zap size={9} /> {TIER_STYLE[c.speedTier].label}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400">
                    <Clock3 size={10} /> by {formatETD(c.etd)}
                  </span>
                  {c.codAvailable && <span className="text-[10px] text-slate-400">&middot; COD ok</span>}
                </div>
                {isAdmin && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Shiprocket <Money v={c.shiprocketRate} inline /> + commission <Money v={c.marginAmount} inline />
                    {!!c.codCharge && <> + COD <Money v={c.codCharge} inline /></>}
                  </p>
                )}
              </div>
              <span className="shrink-0 flex items-center gap-0.5 text-sm font-bold text-slate-800">
                <IndianRupee size={12} />{c.finalCharge}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setCouriers(null)} className="text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {shipment?.finalCharge != null && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 space-y-1">
              <p className="text-[11px] font-medium text-blue-700">Quoted at checkout — {shipment.courierName ?? "cheapest courier"}</p>
              {isAdmin && shipment.shiprocketRate != null && (
                <>
                  <Row label="Shiprocket actual charge" value={<Money v={shipment.shiprocketRate} />} />
                  <Row
                    label={`Delivery commission${shipment.marginType === "percentage" ? ` (${shipment.marginValue}%)` : ""}`}
                    value={<Money v={shipment.marginAmount} />}
                  />
                  {!!shipment.codCharge && <Row label="COD charge" value={<Money v={shipment.codCharge} />} />}
                </>
              )}
              <Row label="Final delivery charge" value={<Money v={shipment.finalCharge} bold />} />
              <p className="text-[10px] text-slate-400">
                {isAdmin
                  ? "This is what the customer & vendor already see. Ship with the same courier, or check live options below."
                  : "What the customer paid for delivery. Pick the same courier, or check live options below."}
              </p>
            </div>
          )}
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={11} />
            {!isAdmin
              ? "Picks up from your registered pickup address"
              : `Pickup pincode: ${group.vendorId === PLATFORM_VENDOR_ID ? "from Settings" : "from vendor profile"}`}
          </p>
          <button
            type="button"
            onClick={loadCouriers}
            disabled={busy !== null}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {busy === "couriers" ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
            {busy === "couriers" ? "Checking couriers…" : "Check Couriers & Ship"}
          </button>
        </div>
      )}

      {(error || shipment?.error) && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error || shipment?.error}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

function Money({ v, bold, inline }: { v?: number; bold?: boolean; inline?: boolean }) {
  return (
    <span className={`inline-flex items-center ${bold ? "font-bold text-slate-800" : ""} ${inline ? "" : ""}`}>
      <IndianRupee size={inline ? 9 : 11} />
      {v ?? 0}
    </span>
  );
}
