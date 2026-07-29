"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/vendors": "Vendors",
  "/users": "Users",
  "/orders": "Orders",
  "/analytics": "Analytics",
  "/categories": "Categories",
  "/banners": "Banners",
  "/settings": "Settings",
  "/vendor/dashboard": "Dashboard",
  "/vendor/products": "My Products",
  "/vendor/orders": "My Orders",
};

export default function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const base = segments[0] === "vendor"
    ? `/vendor/${segments[1] ?? ""}`
    : `/${segments[0] ?? ""}`;
  const title = titles[base] ?? "Panel";

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-lg border border-transparent focus:border-orange-300 focus:bg-white focus:outline-none w-56 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
