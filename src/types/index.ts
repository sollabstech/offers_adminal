export type ProductStatus = "active" | "inactive" | "out_of_stock";
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

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  active: boolean;
  order: number;
  createdAt: string;
}
