"use client";

import { useState, useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";
import { Save, Shield, CreditCard, Eye, EyeOff, CheckCircle, Truck, Percent, Trash2, Loader2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { MarginRule, ShippingRules } from "@/types";

type TextKey = "siteName" | "siteEmail" | "adminEmail";
type BoolKey = "orderNotifications" | "vendorNotifications" | "userNotifications";

interface FormState {
  siteName: string;
  siteEmail: string;
  currency: string;
  timezone: string;
  adminEmail: string;
  orderNotifications: boolean;
  vendorNotifications: boolean;
  userNotifications: boolean;
}

const TEXT_FIELDS: { label: string; key: TextKey }[] = [
  { label: "Site Name", key: "siteName" },
  { label: "Support Email", key: "siteEmail" },
  { label: "Admin Email", key: "adminEmail" },
];

const TOGGLE_FIELDS: { label: string; key: BoolKey; desc: string }[] = [
  { label: "New Order Notifications", key: "orderNotifications", desc: "Get notified when a new order is placed" },
  { label: "Vendor Approval Alerts", key: "vendorNotifications", desc: "Alert when a new vendor registers" },
  { label: "New User Sign-ups", key: "userNotifications", desc: "Notify on every new user registration" },
];

const EMPTY_RULES: ShippingRules = {
  defaultMargin: { marginType: "fixed", marginValue: 0 },
  codCharge: 0,
};

export default function SettingsPage() {
  const { adminEmail, vendors } = useAdminStore();
  const [saved, setSaved] = useState(false);

  // ── Razorpay state ──────────────────────────────────────────────────────────
  const [rzp, setRzp] = useState({ keyId: "", keySecret: "" });
  const [rzpLoading, setRzpLoading] = useState(true);
  const [rzpSaved, setRzpSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "razorpay"))
      .then((snap) => {
        if (snap.exists()) setRzp({ keyId: snap.data().keyId ?? "", keySecret: snap.data().keySecret ?? "" });
      })
      .catch(() => {})
      .finally(() => setRzpLoading(false));
  }, []);

  const handleRzpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "settings", "razorpay"), rzp);
    setRzpSaved(true);
    setTimeout(() => setRzpSaved(false), 2500);
  };
  // ────────────────────────────────────────────────────────────────────────────

  // ── Shiprocket state ────────────────────────────────────────────────────────
  // Default channelId to the "Custom" sales channel — Shiprocket's channel for
  // orders created via API (as opposed to "Manual", for orders typed directly
  // into the Shiprocket dashboard). Only used as a suggestion until saved.
  const [srkt, setSrkt] = useState({ email: "", password: "", pickupLocation: "", pickupPincode: "", channelId: "11744145" });
  const [srktLoading, setSrktLoading] = useState(true);
  const [srktSaved, setSrktSaved] = useState(false);
  const [showSrktPassword, setShowSrktPassword] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "shiprocket"))
      .then((snap) => {
        if (snap.exists()) {
          setSrkt({
            email: snap.data().email ?? "",
            password: snap.data().password ?? "",
            pickupLocation: snap.data().pickupLocation ?? "",
            pickupPincode: snap.data().pickupPincode ?? "",
            channelId: snap.data().channelId ?? "11744145",
          });
        }
      })
      .catch(() => {})
      .finally(() => setSrktLoading(false));
  }, []);

  const handleSrktSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "settings", "shiprocket"), srkt);
    setSrktSaved(true);
    setTimeout(() => setSrktSaved(false), 2500);
    testSrktConnection();
  };

  const [srktStatus, setSrktStatus] = useState<{
    configured: boolean;
    authenticated: boolean | null;
    error?: string;
    warning?: string;
    savedPickupLocation?: string;
    pickupLocationMatches?: boolean | null;
    registeredPickupLocations?: string[];
  } | null>(null);
  const [srktTesting, setSrktTesting] = useState(false);

  const testSrktConnection = async () => {
    setSrktTesting(true);
    try {
      const res = await fetch("/api/shiprocket/status");
      setSrktStatus(await res.json());
    } catch {
      setSrktStatus({ configured: true, authenticated: false, error: "Could not reach the server." });
    } finally {
      setSrktTesting(false);
    }
  };

  useEffect(() => {
    testSrktConnection();
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  // ── Shipping Pricing Rules state ────────────────────────────────────────────
  const [rules, setRules] = useState<ShippingRules>(EMPTY_RULES);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaved, setRulesSaved] = useState(false);
  const [newOverrideVendor, setNewOverrideVendor] = useState("");

  useEffect(() => {
    getDoc(doc(db, "settings", "shippingRules"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRules({
            defaultMargin: data.defaultMargin ?? EMPTY_RULES.defaultMargin,
            codCharge: data.codCharge ?? 0,
            minCharge: data.minCharge ?? undefined,
            maxCharge: data.maxCharge ?? undefined,
            vendorMargins: data.vendorMargins ?? {},
          });
        }
      })
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }, []);

  const handleRulesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "settings", "shippingRules"), rules);
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2500);
  };

  const setVendorOverride = (vendorId: string, rule: MarginRule | null) => {
    setRules((r) => {
      const vendorMargins = { ...(r.vendorMargins ?? {}) };
      if (rule) vendorMargins[vendorId] = rule;
      else delete vendorMargins[vendorId];
      return { ...r, vendorMargins };
    });
  };
  // ────────────────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>({
    siteName: "Offerss",
    siteEmail: "support@offerss.com",
    currency: "INR",
    timezone: "Asia/Riyadh",
    adminEmail: adminEmail,
    orderNotifications: true,
    vendorNotifications: true,
    userNotifications: false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-400 text-sm">Manage your admin panel configuration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">General</h3>

          {TEXT_FIELDS.map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="EGP">EGP — Egyptian Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <Shield size={14} /> Notifications
          </h3>
          {TOGGLE_FIELDS.map(({ label, key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${form[key] ? "bg-orange-500" : "bg-slate-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          <Save size={16} />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </form>

      {/* ── Razorpay Payment Gateway ───────────────────────────────────────── */}
      <form onSubmit={handleRzpSave} className="space-y-5 mt-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <CreditCard size={14} /> Razorpay Payment Gateway
          </h3>
          <p className="text-xs text-slate-400">
            Enter your Razorpay credentials. These are stored securely and used to process payments on the storefront.
            Get your keys from{" "}
            <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
              dashboard.razorpay.com
            </a>.
          </p>

          {rzpLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Key ID <span className="text-slate-400 font-normal">(public)</span>
                </label>
                <input
                  value={rzp.keyId}
                  onChange={(e) => setRzp((r) => ({ ...r, keyId: e.target.value }))}
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Key Secret <span className="text-slate-400 font-normal">(keep private)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={rzp.keySecret}
                    onChange={(e) => setRzp((r) => ({ ...r, keySecret: e.target.value }))}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={rzpLoading}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          {rzpSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {rzpSaved ? "Razorpay Saved!" : "Save Razorpay Keys"}
        </button>
      </form>

      {/* ── Shiprocket Shipping ────────────────────────────────────────────── */}
      <form onSubmit={handleSrktSave} className="space-y-5 mt-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
              <Truck size={14} /> Shiprocket Shipping
            </h3>
            <div className="flex items-center gap-2">
              {srktTesting ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                  <Loader2 size={12} className="animate-spin" /> Checking…
                </span>
              ) : !srktStatus || !srktStatus.configured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                  Not configured
                </span>
              ) : srktStatus.authenticated === true ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle size={12} /> Connected
                </span>
              ) : srktStatus.authenticated === false ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  <XCircle size={12} /> Auth failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <AlertTriangle size={12} /> Incomplete
                </span>
              )}
              <button
                type="button"
                onClick={testSrktConnection}
                disabled={srktTesting}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                <RefreshCw size={11} /> Test Connection
              </button>
            </div>
          </div>
          {(srktStatus?.error || srktStatus?.warning) && (
            <p className={`text-xs rounded-lg px-2.5 py-1.5 border ${srktStatus.error ? "text-red-600 bg-red-50 border-red-100" : "text-amber-700 bg-amber-50 border-amber-100"}`}>
              {srktStatus.error || srktStatus.warning}
            </p>
          )}
          {srktStatus?.authenticated === true && srktStatus.pickupLocationMatches === false && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 space-y-1">
              <p>
                <strong>&ldquo;{srktStatus.savedPickupLocation}&rdquo;</strong> is not registered as a pickup address on your Shiprocket
                account — order creation will fail until this matches exactly. Shiprocket cannot create a pickup location from this
                form; it must already exist in your Shiprocket dashboard (Settings → Company Setup → Pickup Addresses).
              </p>
              {srktStatus.registeredPickupLocations && srktStatus.registeredPickupLocations.length > 0 ? (
                <p>
                  Registered on your account: {srktStatus.registeredPickupLocations.map((n) => `"${n}"`).join(", ")} — update the
                  Pickup Location field below to match one of these exactly.
                </p>
              ) : (
                <p>No pickup addresses are registered on your Shiprocket account yet — add one there first.</p>
              )}
            </div>
          )}
          {srktStatus?.authenticated === true && srktStatus.pickupLocationMatches === true && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
              Pickup Location &ldquo;{srktStatus.savedPickupLocation}&rdquo; matches a registered Shiprocket pickup address.
            </p>
          )}
          <p className="text-xs text-slate-400">
            Enter your Shiprocket login (or a dedicated API user from{" "}
            <a href="https://app.shiprocket.in/seller/settings/additional-settings/api-users" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
              Settings → API Users
            </a>
            ). Used server-side to create shipments and AWBs when you ship an order — never sent to the browser.
          </p>

          {srktLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  value={srkt.email}
                  onChange={(e) => setSrkt((s) => ({ ...s, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password <span className="text-slate-400 font-normal">(keep private)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSrktPassword ? "text" : "password"}
                    value={srkt.password}
                    onChange={(e) => setSrkt((s) => ({ ...s, password: e.target.value }))}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSrktPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSrktPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Pickup Location <span className="text-slate-400 font-normal">(nickname)</span>
                </label>
                <input
                  value={srkt.pickupLocation}
                  onChange={(e) => setSrkt((s) => ({ ...s, pickupLocation: e.target.value }))}
                  placeholder="e.g. Primary Warehouse"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Must exactly match a pickup address nickname from Shiprocket dashboard → Settings → Company Setup → Pickup Addresses.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Pickup Pincode <span className="text-slate-400 font-normal">(for delivery-estimate checks)</span>
                </label>
                <input
                  value={srkt.pickupPincode}
                  onChange={(e) => setSrkt((s) => ({ ...s, pickupPincode: e.target.value }))}
                  placeholder="e.g. 110001"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sales Channel ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={srkt.channelId}
                  onChange={(e) => setSrkt((s) => ({ ...s, channelId: e.target.value }))}
                  placeholder="e.g. 11744145"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">
                  From Shiprocket dashboard → Settings → Channels. Use the <strong>CUSTOM</strong> channel (orders created via API) — not <strong>MANUAL</strong>, which is for orders entered by hand in the Shiprocket dashboard. Leave blank to let Shiprocket pick automatically.
                </p>
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={srktLoading}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          {srktSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {srktSaved ? "Shiprocket Saved!" : "Save Shiprocket Credentials"}
        </button>
      </form>

      {/* ── Set Commission (Delivery Charges) ─────────────────────────────── */}
      <form onSubmit={handleRulesSave} className="space-y-5 mt-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <Percent size={14} /> Set Commission — Delivery Charges
          </h3>
          <p className="text-xs text-slate-400">
            Applied automatically to every order — the actual Shiprocket delivery charge always stays visible separately from this commission. Example: Shiprocket charges ₹50, a ₹10 fixed commission here makes the final delivery charge ₹60 for the vendor and the customer, and future orders pick up any change here immediately.
          </p>

          {rulesLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Delivery Commission (all vendors, unless overridden below)</label>
                <div className="flex gap-2">
                  <select
                    value={rules.defaultMargin.marginType}
                    onChange={(e) => setRules((r) => ({ ...r, defaultMargin: { ...r.defaultMargin, marginType: e.target.value as MarginRule["marginType"] } }))}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="fixed">₹ Fixed</option>
                    <option value="percentage">% Percentage</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rules.defaultMargin.marginValue}
                    onChange={(e) => setRules((r) => ({ ...r, defaultMargin: { ...r.defaultMargin, marginValue: Number(e.target.value) } }))}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">COD extra charge (₹)</label>
                  <input
                    type="number" min="0"
                    value={rules.codCharge}
                    onChange={(e) => setRules((r) => ({ ...r, codCharge: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Min charge (₹)</label>
                  <input
                    type="number" min="0"
                    value={rules.minCharge ?? ""}
                    placeholder="none"
                    onChange={(e) => setRules((r) => ({ ...r, minCharge: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Max charge (₹)</label>
                  <input
                    type="number" min="0"
                    value={rules.maxCharge ?? ""}
                    placeholder="none"
                    onChange={(e) => setRules((r) => ({ ...r, maxCharge: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-2">Vendor-Specific Delivery Commission</p>
                <div className="space-y-2">
                  {Object.entries(rules.vendorMargins ?? {}).map(([vendorId, rule]) => {
                    const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? vendorId;
                    return (
                      <div key={vendorId} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-slate-700 truncate">{vendorName}</span>
                        <select
                          value={rule.marginType}
                          onChange={(e) => setVendorOverride(vendorId, { ...rule, marginType: e.target.value as MarginRule["marginType"] })}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="fixed">₹ Fixed</option>
                          <option value="percentage">% Percent</option>
                        </select>
                        <input
                          type="number" min="0" step="0.01"
                          value={rule.marginValue}
                          onChange={(e) => setVendorOverride(vendorId, { ...rule, marginValue: Number(e.target.value) })}
                          className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <button type="button" onClick={() => setVendorOverride(vendorId, null)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={newOverrideVendor}
                    onChange={(e) => setNewOverrideVendor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">+ Add vendor override…</option>
                    {vendors.filter((v) => !(rules.vendorMargins ?? {})[v.id]).map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!newOverrideVendor}
                    onClick={() => {
                      setVendorOverride(newOverrideVendor, { marginType: "fixed", marginValue: 0 });
                      setNewOverrideVendor("");
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-semibold rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={rulesLoading}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
        >
          {rulesSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {rulesSaved ? "Commission Saved!" : "Save Delivery Commission"}
        </button>
      </form>
    </div>
  );
}
