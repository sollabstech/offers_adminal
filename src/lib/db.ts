"use client";

import {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp,
  onSnapshot, writeBatch, deleteField, type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product, Vendor, Order, User, Banner, Category, ReturnRequest, PromotionBid } from "@/types";

// ─── Products ───────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function saveProduct(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), { ...product, updatedAt: new Date().toISOString() });
}

export async function removeProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

export function listenProducts(cb: (products: Product[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)))
  );
}

// ─── Vendors ────────────────────────────────────────────────────────────────

export async function fetchVendors(): Promise<Vendor[]> {
  const snap = await getDocs(query(collection(db, "vendors"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
}

export async function saveVendor(vendor: Vendor): Promise<void> {
  await setDoc(doc(db, "vendors", vendor.id), vendor);
}

export async function removeVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

export async function updateVendorProductsStatus(vendorId: string, vendorStatus: string): Promise<void> {
  const snap = await getDocs(collection(db, "products"));
  const vendorProducts = snap.docs.filter((d) => d.data().vendorId === vendorId);
  await Promise.all(vendorProducts.map((d) => updateDoc(d.ref, { vendorStatus })));
}

export function listenVendors(cb: (vendors: Vendor[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "vendors"), orderBy("joinedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor)))
  );
}

// ─── Orders (read-only in admin — written by website) ───────────────────────

export async function fetchOrders(): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
  await updateDoc(doc(db, "orders", id), { status, updatedAt: new Date().toISOString() });
}

export function listenOrders(cb: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
  );
}

// ─── Users (read-only in admin — written by website on login) ───────────────

export async function fetchUsers(): Promise<User[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
}

export async function updateUserStatus(id: string, status: User["status"]): Promise<void> {
  await updateDoc(doc(db, "users", id), { status });
}

export function listenUsers(cb: (users: User[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "users"), orderBy("joinedAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)))
  );
}

// ─── Banners ─────────────────────────────────────────────────────────────────

export async function saveBanner(banner: Banner): Promise<void> {
  await setDoc(doc(db, "banners", banner.id), banner);
}

export async function removeBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "banners", id));
}

export function listenBanners(cb: (banners: Banner[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "banners"), orderBy("order", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Banner)))
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function saveCategory(category: Category): Promise<void> {
  await setDoc(doc(db, "categories", category.id), category);
}

export async function removeCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

export function listenCategories(cb: (categories: Category[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "categories"), orderBy("order", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)))
  );
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export async function updateReturnStatus(id: string, status: ReturnRequest["status"]): Promise<void> {
  await updateDoc(doc(db, "returns", id), { status, updatedAt: new Date().toISOString() });
}

export function listenReturns(cb: (returns: ReturnRequest[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "returns"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRequest)))
  );
}

// ─── Promotion bids (vendors pay for top placement) ─────────────────────────

export function listenPromotionBids(cb: (bids: PromotionBid[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "promotionBids"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromotionBid)))
  );
}

export async function savePromotionBid(bid: PromotionBid): Promise<void> {
  await setDoc(doc(db, "promotionBids", bid.id), bid);
}

export async function setPromotionBidStatus(id: string, status: "rejected" | "withdrawn"): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, "promotionBids", id), { status, decidedAt: now, updatedAt: now });
}

/** Approve a bid: stamps the promotion window on the bid and mirrors it onto the product the storefront reads. */
export async function approvePromotionBid(bid: PromotionBid, rank: number, replacedBidId?: string): Promise<void> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + bid.days * 24 * 60 * 60 * 1000).toISOString();
  const batch = writeBatch(db);
  batch.update(doc(db, "promotionBids", bid.id), {
    status: "approved",
    rank,
    startsAt: now.toISOString(),
    endsAt,
    decidedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  batch.update(doc(db, "products", bid.productId), {
    promotedRank: rank,
    promotedUntil: endsAt,
    promotedBid: bid.amount,
    promotionBidId: bid.id,
  });
  if (replacedBidId && replacedBidId !== bid.id) {
    batch.update(doc(db, "promotionBids", replacedBidId), {
      status: "ended",
      endsAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }
  await batch.commit();
}

export async function setPromotionRank(bid: PromotionBid, rank: number): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "promotionBids", bid.id), { rank, updatedAt: new Date().toISOString() });
  batch.update(doc(db, "products", bid.productId), { promotedRank: rank });
  await batch.commit();
}

/** Stop a live promotion now. Pass clearProduct=false if the product no longer exists. */
export async function endPromotion(bid: PromotionBid, clearProduct: boolean): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.update(doc(db, "promotionBids", bid.id), { status: "ended", endsAt: now, updatedAt: now });
  if (clearProduct) {
    batch.update(doc(db, "products", bid.productId), {
      promotedRank: deleteField(),
      promotedUntil: deleteField(),
      promotedBid: deleteField(),
      promotionBidId: deleteField(),
    });
  }
  await batch.commit();
}

// ─── Vendor credential lookup ───────────────────────────────────────────────

export async function findVendorByCredentials(username: string, password: string): Promise<import("@/types").Vendor | null> {
  const snap = await getDocs(collection(db, "vendors"));
  const vendor = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as import("@/types").Vendor))
    .find((v) => v.username === username && v.password === password && v.status === "active");
  return vendor ?? null;
}

// ─── Seed (run once when Firestore collections are empty) ───────────────────

export async function seedIfEmpty(
  products: Product[],
  vendors: Vendor[]
): Promise<void> {
  const productSnap = await getDocs(collection(db, "products"));
  if (productSnap.empty) {
    await Promise.all(products.map((p) => setDoc(doc(db, "products", p.id), p)));
  }
  const vendorSnap = await getDocs(collection(db, "vendors"));
  if (vendorSnap.empty) {
    await Promise.all(vendors.map((v) => setDoc(doc(db, "vendors", v.id), v)));
  }
}
