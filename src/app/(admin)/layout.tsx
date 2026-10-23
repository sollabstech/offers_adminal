"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAdminStore } from "@/store/adminStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role, initFirestore, loading, hasHydrated } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for zustand/persist to finish reading localStorage before deciding
    // to redirect — otherwise a fresh page load sees the pre-hydration
    // isLoggedIn:false default and bounces an already-logged-in admin out.
    if (!hasHydrated) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (role === "vendor") {
      router.push("/vendor/dashboard");
      return;
    }
    initFirestore();
  }, [hasHydrated, isLoggedIn, role, router, initFirestore]);

  if (!hasHydrated) return null;
  if (!isLoggedIn || role === "vendor") return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
