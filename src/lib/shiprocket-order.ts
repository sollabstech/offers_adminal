/**
 * Turns a Firestore order into one Shiprocket "shipment context" per vendor
 * whose products are in it — since Shiprocket ships from a single pickup
 * location per shipment, a multi-vendor order becomes multiple shipments.
 * Shared by the courier-quote, ship, and pricing-preview routes.
 */
import { getDocData, getShiprocketConfig } from "./firebase-server";
import type { Order, OrderItem, Product, ShippingAddress, Vendor } from "@/types";

export const PLATFORM_VENDOR_ID = "__offerss__";

export function isCOD(paymentMethod: string): boolean {
  return /cod|cash on delivery/i.test(paymentMethod);
}

/** Parse "Name, Line1, City, State Pincode, Country" if no structured address was saved. */
export function fallbackAddress(order: Order): ShippingAddress {
  const parts = (order.shippingAddress ?? "").split(",").map((p) => p.trim());
  return {
    fullName: order.userName || parts[0] || "Customer",
    line1: parts[1] || order.shippingAddress || "N/A",
    city: parts[2] || "",
    state: (parts[3] ?? "").replace(/\s*\d{4,6}$/, "").trim(),
    postalCode: (parts[3]?.match(/\d{4,6}/)?.[0]) ?? "",
    country: parts[4] || "India",
    phone: order.userPhone || "9999999999",
  };
}

export class OrderLookupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface VendorGroup {
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  pickupPincode: string;
  pickupLocation: string;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  /** True if any item was missing weight/height/width and a default had to be used. */
  usedEstimatedPackage: boolean;
}

export interface OrderShipmentInput {
  order: Order;
  deliveryAddress: ShippingAddress;
  groups: VendorGroup[];
}

/**
 * Resolve the pickup pincode/location for one vendor (or the platform, for
 * admin-owned items). Returns empty strings — never null — when incomplete,
 * so a missing pickup config never masks the vendor's real name.
 */
async function resolvePickup(vendorId: string): Promise<{ pincode: string; location: string }> {
  if (vendorId === PLATFORM_VENDOR_ID) {
    const config = await getShiprocketConfig();
    return { pincode: config?.pickupPincode ?? "", location: config?.pickupLocation ?? "" };
  }
  const vendorData = await getDocData("vendors", vendorId);
  const vendor = vendorData as Vendor | null;
  return { pincode: vendor?.pincode ?? "", location: vendor?.pickupLocationNickname ?? "" };
}

/**
 * Load the order, look up each item's product to find which vendor it
 * belongs to, and group into one shippable context per vendor. Throws
 * OrderLookupError for missing orders / incomplete delivery addresses;
 * a group with an empty pickupPincode means that vendor's pickup location
 * isn't configured yet (caller should surface that per-group, not fail the
 * whole order — other vendors' items may still be shippable).
 */
export async function buildOrderShipmentGroups(orderId: string): Promise<OrderShipmentInput> {
  const orderData = await getDocData("orders", orderId);
  if (!orderData) throw new OrderLookupError(`Order ${orderId} not found`, 404);
  const order = { id: orderId, ...orderData } as Order;

  const deliveryAddress = order.address ?? fallbackAddress(order);
  if (!deliveryAddress.postalCode || !deliveryAddress.city || !deliveryAddress.state) {
    throw new OrderLookupError(
      "Order is missing a complete shipping address (city/state/pincode) — cannot ship.",
      400
    );
  }

  const productDocs = await Promise.all(order.items.map((item) => getDocData("products", item.productId)));

  const byVendor = new Map<string, { items: OrderItem[]; products: (Product | null)[] }>();
  order.items.forEach((item, i) => {
    const product = productDocs[i] as Product | null;
    const vendorId = product?.vendorId || PLATFORM_VENDOR_ID;
    const bucket = byVendor.get(vendorId) ?? { items: [], products: [] };
    bucket.items.push(item);
    bucket.products.push(product);
    byVendor.set(vendorId, bucket);
  });

  const groups: VendorGroup[] = [];
  for (const [vendorId, bucket] of byVendor) {
    const pickup = await resolvePickup(vendorId);

    let weight = 0;
    let length = 0;
    let breadth = 0;
    let usedEstimatedPackage = false;
    bucket.items.forEach((item, i) => {
      const product = bucket.products[i];
      if (!product?.weight || product.weight <= 0 || !product?.height || product.height <= 0 || !product?.width || product.width <= 0) {
        usedEstimatedPackage = true;
      }
      const unitWeight = product?.weight && product.weight > 0 ? product.weight : 0.5;
      weight += unitWeight * item.quantity;
      length = Math.max(length, product?.height && product.height > 0 ? product.height : 10);
      breadth = Math.max(breadth, product?.width && product.width > 0 ? product.width : 10);
    });

    const vendorName =
      vendorId === PLATFORM_VENDOR_ID ? "Offerss.com" : bucket.products.find((p) => p?.vendorName)?.vendorName ?? vendorId;

    groups.push({
      vendorId,
      vendorName,
      items: bucket.items,
      pickupPincode: pickup.pincode,
      pickupLocation: pickup.location,
      weight: Math.max(weight, 0.1),
      length,
      breadth,
      height: 5,
      usedEstimatedPackage,
    });
  }

  return { order, deliveryAddress, groups };
}
