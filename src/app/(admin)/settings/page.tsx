"use client";

import { useState, useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";
import { Save, Shield, CreditCard, Eye, EyeOff, CheckCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

export default function SettingsPage() {
  const { adminEmail } = useAdminStore();
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
    </div>
  );
}
