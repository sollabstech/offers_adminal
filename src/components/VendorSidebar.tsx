"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, LogOut, ChevronRight, Store,
} from "lucide-react";
import { useAdminStore } from "@/store/adminStore";

const navItems = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/products", label: "My Products", icon: Package },
  { href: "/vendor/orders", label: "My Orders", icon: ShoppingCart },
];

export default function VendorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, vendors, vendorId } = useAdminStore();
  const vendor = vendors.find((v) => v.id === vendorId);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-40">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Store size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">Offerss</p>
          <p className="text-slate-400 text-xs">Vendor Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
          Main Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    active
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={18} className={active ? "text-white" : "text-slate-500 group-hover:text-white"} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={14} className="text-white/60" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(vendor?.name ?? "V")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{vendor?.name ?? "Vendor"}</p>
            <p className="text-slate-500 text-xs truncate">{vendor?.company ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
