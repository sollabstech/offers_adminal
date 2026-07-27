"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Vendor, User, Order, Banner } from "@/types";
import { products as seedProducts, vendors as seedVendors } from "@/data/mockData";
import * as db from "@/lib/db";
import type { Unsubscribe } from "firebase/firestore";

// Module-level: tracks active listeners so we never attach duplicates
let activeListeners: Unsubscribe[] = [];

function clearListeners() {
  activeListeners.forEach((unsub) => unsub());
  activeListeners = [];
}

interface AdminState {
  isLoggedIn: boolean;
  adminEmail: string;
  role: "admin" | "vendor";
  vendorId: string;
  products: Product[];
  vendors: Vendor[];
  users: User[];
  orders: Order[];
  banners: Banner[];
  loading: boolean;
  seeded: boolean;

  login: (email: string, role?: "admin" | "vendor", vendorId?: string) => void;
  logout: () => void;
  initFirestore: () => Promise<void>;

  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  updateUserStatus: (id: string, status: User["status"]) => Promise<void>;
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>;

  saveBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      adminEmail: "",
      role: "admin" as "admin" | "vendor",
      vendorId: "",
      products: [],
      vendors: [],
      users: [],
      orders: [],
      banners: [],
      loading: false,
      seeded: false,

      login: (email, role = "admin", vendorId = "") =>
        set({ isLoggedIn: true, adminEmail: email, role, vendorId }),

      logout: () => {
        clearListeners();
        set({ isLoggedIn: false, adminEmail: "", role: "admin", vendorId: "", products: [], vendors: [], users: [], orders: [], banners: [] });
      },

      initFirestore: async () => {
        // Guard: don't attach a second set of listeners if already running
        if (activeListeners.length > 0) return;

        set({ loading: true });
        try {
          // Seed Firestore with mock data on first ever run
          if (!get().seeded) {
            await db.seedIfEmpty(seedProducts, seedVendors);
            set({ seeded: true });
          }

          // Attach real-time listeners — store unsubscribers so we can clean up
          activeListeners.push(
            db.listenProducts((products) => set({ products })),
            db.listenVendors((vendors) => set({ vendors })),
            db.listenOrders((orders) => set({ orders })),
            db.listenUsers((users) => set({ users })),
            db.listenBanners((banners) => set({ banners }))
          );
        } catch (err) {
          console.error("Firestore init failed:", err);
        } finally {
          set({ loading: false });
        }
      },

      addProduct: async (product) => {
        const vendor = get().vendors.find((v) => v.id === product.vendorId);
        await db.saveProduct({ ...product, vendorStatus: vendor?.status ?? "active" });
      },

      updateProduct: async (id, updates) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return;
        const vendorId = updates.vendorId ?? existing.vendorId;
        const vendor = get().vendors.find((v) => v.id === vendorId);
        await db.saveProduct({ ...existing, ...updates, vendorStatus: vendor?.status ?? "active" });
      },

      deleteProduct: async (id) => {
        await db.removeProduct(id);
      },

      addVendor: async (vendor) => {
        await db.saveVendor(vendor);
      },

      updateVendor: async (id, updates) => {
        const existing = get().vendors.find((v) => v.id === id);
        if (!existing) return;
        await db.saveVendor({ ...existing, ...updates });
        if (updates.status && updates.status !== existing.status) {
          await db.updateVendorProductsStatus(id, updates.status);
        }
      },

      deleteVendor: async (id) => {
        await db.removeVendor(id);
      },

      updateUserStatus: async (id, status) => {
        await db.updateUserStatus(id, status);
      },

      updateOrderStatus: async (id, status) => {
        await db.updateOrderStatus(id, status);
      },

      saveBanner: async (banner) => {
        await db.saveBanner(banner);
      },

      deleteBanner: async (id) => {
        await db.removeBanner(id);
      },
    }),
    {
      name: "admin-store",
      // Only persist auth state and seed flag — everything else comes live from Firestore
      partialize: (s) => ({
        isLoggedIn: s.isLoggedIn,
        adminEmail: s.adminEmail,
        seeded: s.seeded,
        role: s.role,
        vendorId: s.vendorId,
      }),
    }
  )
);
