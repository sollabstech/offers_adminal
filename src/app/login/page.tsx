"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, Lock, User } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { findVendorByCredentials } from "@/lib/db";

export default function LoginPage() {
  const [email, setEmail] = useState(""); // also used for vendor username
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAdminStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    // Admin check
    if (email === "admin@offerss.com" && password === "admin123") {
      login(email, "admin", "");
      router.push("/dashboard");
      return;
    }

    // Vendor check via Firestore
    try {
      const vendor = await findVendorByCredentials(email, password);
      if (vendor) {
        login(vendor.email, "vendor", vendor.id);
        router.push("/vendor/dashboard");
        return;
      }
    } catch (err) {
      console.error("Vendor auth error:", err);
    }

    setError("Invalid credentials. Please check your username and password.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 shadow-2xl shadow-orange-500/40 mb-4">
            <Zap size={28} className="text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Offerss Admin</h1>
          <p className="text-slate-400 mt-1">Sign in to your admin panel</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email or Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email or username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-5 p-3 bg-slate-700/50 rounded-xl">
            <p className="text-slate-400 text-xs text-center">
              Admin: <span className="text-slate-300 font-medium">admin@offerss.com</span> / <span className="text-slate-300 font-medium">admin123</span>
              <br />Vendors use credentials set by Admin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
