export type ProductStatus = "active" | "inactive" | "out_of_stock";
export type DeliverySpeed = "fast" | "1-day" | "7-day";
export type ListingType = "sale" | "liquidation";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type VendorStatus = "active" | "suspended" | "pending";
export type UserStatus = "active" | "banned";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  status: VendorStatus;
  productsCount: number;
  totalRevenue: number;
  joinedAt: string;
  avatar: string;
  // Vendor login credentials (set by admin)
  username?: string;
  password?: string;
  address?: string;
  gstNumber?: string;
  // Shiprocket pickup location for this vendor's shipments.
  pincode?: string;
  /**
   * Nickname registered with Shiprocket for this vendor's pickup address.
   * Set automatically by "Register with Shiprocket" (POST /settings/company/addpickup) —
   * can also be pasted manually if the vendor's address was already registered
   * directly in the Shiprocket dashboard.
   */
  pickupLocationNickname?: string;
  /** Structured pickup address — required to auto-register the pickup location with Shiprocket. */
  pickupContactName?: string;
  pickupPhone?: string;
  pickupAddressLine1?: string;
  pickupAddressLine2?: string;
  pickupCity?: string;
  pickupState?: string;
  pickupCountry?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  vendorId: string;
  vendorName: string;
  stock: number;
  sold: number;
  status: ProductStatus;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  createdAt: string;
  specifications?: Record<string, string>;
  vendorStatus?: string;
  // Shipping dimensions in cm and weight in kg
  height?: number;
  width?: number;
  weight?: number;
  // Delivery promise shown to shoppers
  deliverySpeed?: DeliverySpeed;
  // "sale" = regular stock, "liquidation" = clearance stock
  listingType?: ListingType;
  // Paid placement, set only by the admin when approving a PromotionBid. Storefront shows the product
  // first (lowest rank first) with a "Sponsored" badge while promotedUntil is in the future.
  promotedRank?: number;
  promotedUntil?: string;
  promotedBid?: number;
  promotionBidId?: string;
}

/** "approved" past its endsAt is shown as expired — no job needed to flip it. */
export type PromotionBidStatus = "pending" | "approved" | "rejected" | "withdrawn" | "ended";

/** A vendor's offer to pay `amount` for `days` of top placement for one product in its category. */
export interface PromotionBid {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  days: number;
  note?: string;
  status: PromotionBidStatus;
  /** Position in the category chosen by the admin on approval (1 = shown first). */
  rank?: number;
  startsAt?: string;
  endsAt?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  ordersCount: number;
  totalSpent: number;
  joinedAt: string;
  lastLoginAt: string;
  avatar: string;
  address?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

/** Structured shipping address — written by the storefront checkout. */
export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export type ShiprocketStatus = "not_shipped" | "shipped" | "cancelled";
export type ShippingMethod = "shiprocket" | "self";

/** "fixed" = flat rupee add-on. "percentage" = % of the actual Shiprocket rate. */
export type ShippingMarginType = "fixed" | "percentage";

export interface MarginRule {
  marginType: ShippingMarginType;
  marginValue: number;
}

/**
 * Admin-configured shipping pricing policy (Firestore: settings/shippingRules).
 * Applied automatically to every quote/shipment — nobody edits per-order prices by hand.
 */
export interface ShippingRules {
  /** Platform-wide default margin added on top of Shiprocket's actual rate. */
  defaultMargin: MarginRule;
  /** Extra flat charge added when the order is Cash on Delivery. */
  codCharge: number;
  /** Optional floor/ceiling applied to the final (post-margin) shipping charge. */
  minCharge?: number;
  maxCharge?: number;
  /** Per-vendor override of defaultMargin, keyed by vendor id. */
  vendorMargins?: Record<string, MarginRule>;
  /** Per-courier override of defaultMargin, keyed by the courier's Shiprocket name. */
  courierMargins?: Record<string, MarginRule>;
}

/**
 * One shipment = one vendor's items within an order, shipped from that vendor's
 * pickup location as a single Shiprocket shipment. A single customer order can
 * contain several of these (one per vendor whose products are in the cart).
 */
export interface OrderShipment {
  /** vendorId, or "__offerss__" for items sold directly by the platform. */
  vendorId: string;
  vendorName: string;
  items: OrderItem[];

  pickupPincode: string;
  pickupLocation: string;
  deliveryPincode: string;

  weight: number;
  length: number;
  breadth: number;
  height: number;
  /** True if weight/dimensions had to fall back to defaults because a product was missing them. */
  usedEstimatedPackage?: boolean;

  paymentMethod: "Prepaid" | "COD";

  // ── Courier & real Shiprocket cost (the "actual" numbers) ──────────────────
  courierId?: number;
  courierName?: string;
  etd?: string;
  shiprocketRate?: number;

  // ── Admin pricing policy applied to this shipment, snapshotted at quote time ─
  marginType?: ShippingMarginType;
  marginValue?: number;
  marginAmount?: number;
  codCharge?: number;
  /** What the customer/vendor was actually charged for this shipment = shiprocketRate + marginAmount + codCharge, clamped to min/max. */
  finalCharge?: number;

  // ── Fulfillment ──────────────────────────────────────────────────────────
  /** "self" = shipped outside Shiprocket; admin typed courierName + awbCode (tracking ID) by hand. Absent = Shiprocket. */
  shippingMethod?: ShippingMethod;
  shippedAt?: string;
  status: ShiprocketStatus;
  shiprocketOrderId?: number;
  shiprocketShipmentId?: number;
  awbCode?: string;
  trackingUrl?: string;
  error?: string;
  /** Pickup requested from Shiprocket via /api/shiprocket/pickup. */
  pickupRequested?: boolean;
  pickupRequestedAt?: string;
  /** Latest known live status, set by /api/shiprocket/track. */
  deliveryStatus?: string;
  lastLocation?: string;
  lastUpdate?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  shippingAddress: string;
  /** Structured version of shippingAddress, used for Shiprocket order creation. */
  address?: ShippingAddress;
  createdAt: string;
  updatedAt: string;

  /** Total shipping charge collected from the customer, across all shipments (= sum of shipments[].finalCharge). */
  shippingCharge?: number;
  /** One entry per vendor whose products are in this order. */
  shipments?: OrderShipment[];
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalVendors: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  orders: number;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkHref: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export type ReturnStatus = "pending" | "approved" | "rejected";

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productName: string;
  productImage: string;
  reason: string;
  details: string;
  type: "return" | "replace";
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  active: boolean;
  order: number;
  createdAt: string;
  subcategories?: Subcategory[];
}
