/**
 * Thin server-side wrapper over the Shiprocket external API.
 * No "use client" — only ever imported from Route Handlers.
 *
 * Auth: POST /v1/external/auth/login with { email, password } — either your
 * main Shiprocket account login or a dedicated API user created under
 * Shiprocket dashboard -> Settings -> API. Both return the same bearer token.
 * Tokens last ~10 days; we cache in-process and refresh a day early.
 *
 * Docs: https://apidocs.shiprocket.in/
 */
import { getShiprocketConfig } from "./firebase-server";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;
let authInFlight: Promise<string> | null = null;

export class ShiprocketError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "ShiprocketError";
    this.status = status;
  }
}

async function authenticate(): Promise<string> {
  if (authInFlight) return authInFlight;

  authInFlight = (async () => {
    const config = await getShiprocketConfig();
    if (!config) {
      throw new ShiprocketError(
        "Shiprocket is not configured. Add your email/password in Admin → Settings → Shiprocket Shipping.",
        503
      );
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.token) {
      throw new ShiprocketError(
        `Shiprocket authentication failed: ${body.message ?? res.statusText}`,
        res.status === 401 ? 401 : 502
      );
    }

    cachedToken = body.token as string;
    cachedTokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return cachedToken;
  })();

  try {
    return await authInFlight;
  } finally {
    authInFlight = null;
  }
}

/** Force a fresh login (ignores the cached token) — used by the connection-test endpoint so it always reflects the currently-saved credentials. */
export async function testConnection(): Promise<{ email: string; tokenExpiresAt: string }> {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
  await authenticate();
  const config = await getShiprocketConfig();
  return { email: config?.email ?? "", tokenExpiresAt: new Date(cachedTokenExpiresAt).toISOString() };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;
  return authenticate();
}

async function request<T = unknown>(
  method: string,
  path: string,
  data?: unknown,
  retryOn401 = true
): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });

  if (res.status === 401 && retryOn401) {
    cachedToken = null;
    cachedTokenExpiresAt = 0;
    return request<T>(method, path, data, false);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // Temporary diagnostic logging (server-side only, never sent to the browser) —
    // dumps exactly what we sent and exactly what Shiprocket sent back, so a
    // confusing/generic error message like "Please add billing/shipping address
    // first" can be root-caused from the real payload instead of guessed at.
    console.error(`Shiprocket API error on ${method} ${path}`, {
      sentPayload: data,
      responseStatus: res.status,
      responseBody: body,
    });

    const errBody = body as { message?: string; errors?: Record<string, string | string[]> };
    const baseMessage = errBody?.message ?? (typeof body === "string" ? body : "Shiprocket API error");
    const fieldErrors = errBody?.errors
      ? Object.entries(errBody.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : msgs}`)
          .join("; ")
      : "";
    throw new ShiprocketError(fieldErrors ? `${baseMessage} — ${fieldErrors}` : baseMessage, res.status);
  }

  return body as T;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface ServiceabilityParams {
  pickup_postcode: string | number;
  delivery_postcode: string | number;
  weight: number;
  cod: 0 | 1;
  declared_value?: number;
}

export function checkServiceability(params: ServiceabilityParams) {
  const qs = new URLSearchParams({
    pickup_postcode: String(params.pickup_postcode),
    delivery_postcode: String(params.delivery_postcode),
    weight: String(params.weight),
    cod: String(params.cod),
  });
  if (params.declared_value != null) qs.set("declared_value", String(params.declared_value));
  return request("GET", `/courier/serviceability/?${qs.toString()}`);
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  hsn?: number | string;
}

export interface CreateShiprocketOrderPayload {
  order_id: string;
  order_date: string; // "YYYY-MM-DD HH:mm"
  pickup_location: string;
  /** Shiprocket sales channel this order is attributed to (Settings -> Channels in Shiprocket). */
  channel_id?: string | number;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string | number;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string | number;
  shipping_is_billing: true;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface CreateShiprocketOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  awb_code: string | null;
  courier_company_id: number | string | null;
  courier_name: string | null;
}

export function createOrder(payload: CreateShiprocketOrderPayload) {
  return request<CreateShiprocketOrderResponse>("POST", "/orders/create/adhoc", payload);
}

export function assignAWB(shipmentId: number | string, courierId?: number | string) {
  return request("POST", "/courier/assign/awb", {
    shipment_id: shipmentId,
    ...(courierId != null ? { courier_id: courierId } : {}),
  });
}

export function requestPickup(shipmentIds: Array<number | string>) {
  return request("POST", "/courier/generate/pickup", { shipment_id: shipmentIds });
}

export interface AddPickupLocationPayload {
  /** Nickname to register this address under. Shiprocket may sanitize it — always read back the value it actually stored. */
  pickup_location: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
}

export interface AddPickupLocationResponse {
  success?: boolean;
  address?: {
    pickup_location?: string;
    id?: number;
    [key: string]: unknown;
  };
  message?: string;
}

/** POST /settings/company/addpickup — registers a new pickup address on the platform's Shiprocket account. */
export function addPickupLocation(payload: AddPickupLocationPayload) {
  return request<AddPickupLocationResponse>("POST", "/settings/company/addpickup", payload);
}

export interface ShiprocketPickupAddress {
  id: number;
  pickup_location: string;
  address: string;
  address_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  [key: string]: unknown;
}

export interface GetPickupLocationsResponse {
  data?: { shipping_address?: ShiprocketPickupAddress[] };
}

/** GET /settings/company/pickup — every pickup address actually registered on the platform's Shiprocket account. */
export function getPickupLocations() {
  return request<GetPickupLocationsResponse>("GET", "/settings/company/pickup");
}

export function trackByAWB(awb: string) {
  return request("GET", `/courier/track/awb/${awb}`);
}

export function trackByShipment(shipmentId: number | string) {
  return request("GET", `/courier/track/shipment/${shipmentId}`);
}

export function cancelOrders(orderIds: Array<number | string>) {
  return request("POST", "/orders/cancel", { ids: orderIds });
}
