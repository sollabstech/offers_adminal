"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import VendorSidebar from "@/components/VendorSidebar";
import Header from "@/components/Header";
import { useAdminStore } from "@/store/adminStore";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role, initFirestore, loading } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (role !== "vendor") {
      router.push("/dashboard");
      return;
    }
    initFirestore();
  }, [isLoggedIn, role, router, initFirestore]);

  if (!isLoggedIn || role !== "vendor") return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <VendorSidebar />
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
