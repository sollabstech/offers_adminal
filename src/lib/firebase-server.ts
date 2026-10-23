/**
 * Server-side Firebase helper (no "use client" — safe to import in Route
 * Handlers). Separate app instance from src/lib/firebase.ts so a "use client"
 * boundary never leaks into server code. Reads the same NEXT_PUBLIC_FIREBASE_*
 * env vars as the client build.
 */
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isConfigured() {
  return Boolean(cfg.apiKey && cfg.projectId);
}

function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(cfg as object);
  return getFirestore(app);
}

export async function getDocData(collectionName: string, id: string): Promise<DocumentData | null> {
  if (!isConfigured()) return null;
  const snap = await getDoc(doc(getDb(), collectionName, id));
  return snap.exists() ? snap.data() : null;
}

export async function setDocData(collectionName: string, id: string, data: DocumentData): Promise<void> {
  await setDoc(doc(getDb(), collectionName, id), data, { merge: true });
}

export async function updateDocData(collectionName: string, id: string, data: DocumentData): Promise<void> {
  await updateDoc(doc(getDb(), collectionName, id), data);
}

export interface ShiprocketConfig {
  email: string;
  password: string;
  pickupLocation: string;
  pickupPincode: string;
  /** Sales channel (Shiprocket Settings -> Channels) orders created here are attributed to. */
  channelId: string;
}

/**
 * Resolve Shiprocket credentials. Order of precedence:
 *   1. Keys saved via the admin panel (Firestore: settings/shiprocket)
 *   2. Environment variables (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD /
 *      SHIPROCKET_PICKUP_LOCATION / SHIPROCKET_PICKUP_PINCODE / SHIPROCKET_CHANNEL_ID)
 */
export async function getShiprocketConfig(): Promise<ShiprocketConfig | null> {
  if (isConfigured()) {
    try {
      const data = await getDocData("settings", "shiprocket");
      if (data?.email && data?.password) {
        return {
          email: data.email as string,
          password: data.password as string,
          pickupLocation: (data.pickupLocation as string) ?? "",
          pickupPincode: (data.pickupPincode as string) ?? "",
          channelId: (data.channelId as string) ?? "",
        };
      }
    } catch {
      // fall through to env
    }
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (email && password) {
    return {
      email,
      password,
      pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ?? "",
      pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE ?? "",
      channelId: process.env.SHIPROCKET_CHANNEL_ID ?? "",
    };
  }
  return null;
}

const DEFAULT_SHIPPING_RULES: import("@/types").ShippingRules = {
  defaultMargin: { marginType: "fixed", marginValue: 0 },
  codCharge: 0,
};

/** Admin-configured shipping pricing policy (Firestore: settings/shippingRules). Falls back to no-margin defaults. */
export async function getShippingRules(): Promise<import("@/types").ShippingRules> {
  try {
    const data = await getDocData("settings", "shippingRules");
    if (!data) return DEFAULT_SHIPPING_RULES;
    return {
      defaultMargin: data.defaultMargin ?? DEFAULT_SHIPPING_RULES.defaultMargin,
      codCharge: typeof data.codCharge === "number" ? data.codCharge : 0,
      minCharge: typeof data.minCharge === "number" ? data.minCharge : undefined,
      maxCharge: typeof data.maxCharge === "number" ? data.maxCharge : undefined,
      vendorMargins: data.vendorMargins ?? undefined,
      courierMargins: data.courierMargins ?? undefined,
    };
  } catch {
    return DEFAULT_SHIPPING_RULES;
  }
}
