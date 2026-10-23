import { NextRequest, NextResponse } from "next/server";
import { updateDocData } from "@/lib/firebase-server";
import { buildOrderShipmentGroups, isCOD, OrderLookupError } from "@/lib/shiprocket-order";
import type { OrderShipment } from "@/types";

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Mark one vendor's items as shipped via a courier booked outside Shiprocket. Re-posting overwrites (edit). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      vendorId?: string;
      courierName?: string;
      trackingId?: string;
      trackingUrl?: string;
    };
    const orderId = body.orderId?.trim();
    const vendorId = body.vendorId?.trim();
    const courierName = body.courierName?.trim();
    const trackingId = body.trackingId?.trim();
    const trackingUrl = body.trackingUrl?.trim() || undefined;

    if (!orderId || !vendorId) {
      return NextResponse.json({ error: "orderId and vendorId are required" }, { status: 400 });
    }
    if (!courierName || !trackingId) {
      return NextResponse.json({ error: "Courier company name and tracking ID are required" }, { status: 400 });
    }
    if (courierName.length > 80 || trackingId.length > 60) {
      return NextResponse.json({ error: "Courier name or tracking ID is too long" }, { status: 400 });
    }
    // Rendered as a link on the storefront, so only allow http(s).
    if (trackingUrl && !isHttpUrl(trackingUrl)) {
      return NextResponse.json({ error: "Tracking link must start with http:// or https://" }, { status: 400 });
    }

    const { order, deliveryAddress, groups } = await buildOrderShipmentGroups(orderId);
    const group = groups.find((g) => g.vendorId === vendorId);
    if (!group) {
      return NextResponse.json({ error: `No items for vendor ${vendorId} on this order` }, { status: 404 });
    }

    const existingShipments = order.shipments ?? [];
    const existing = existingShipments.find((s) => s.vendorId === vendorId);
    if (existing?.status === "shipped" && existing.shippingMethod !== "self" && existing.awbCode) {
      return NextResponse.json(
        { error: "This shipment is already booked on Shiprocket. Cancel it there first." },
        { status: 409 }
      );
    }

    // Keep the checkout quote (finalCharge etc.) — that's what the customer paid for delivery.
    const shipment: OrderShipment = {
      ...existing,
      vendorId,
      vendorName: group.vendorName,
      items: group.items,
      pickupPincode: group.pickupPincode,
      pickupLocation: group.pickupLocation,
      deliveryPincode: deliveryAddress.postalCode,
      weight: group.weight,
      length: group.length,
      breadth: group.breadth,
      height: group.height,
      paymentMethod: isCOD(order.paymentMethod) ? "COD" : "Prepaid",
      shippingMethod: "self",
      courierName,
      awbCode: trackingId,
      shippedAt: existing?.shippingMethod === "self" && existing.shippedAt ? existing.shippedAt : new Date().toISOString(),
      status: "shipped",
    };
    delete shipment.trackingUrl;
    delete shipment.error;
    delete shipment.shiprocketOrderId;
    delete shipment.shiprocketShipmentId;
    delete shipment.courierId;
    delete shipment.deliveryStatus;
    delete shipment.lastLocation;
    delete shipment.lastUpdate;
    delete shipment.pickupRequested;
    delete shipment.pickupRequestedAt;
    delete shipment.usedEstimatedPackage;
    if (trackingUrl) shipment.trackingUrl = trackingUrl;

    const shipments = [...existingShipments.filter((s) => s.vendorId !== vendorId), shipment];
    const shippingCharge = shipments
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + (s.finalCharge ?? 0), 0);

    await updateDocData("orders", order.id, {
      status: order.status === "delivered" ? "delivered" : "shipped",
      shipments,
      shippingCharge,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ shipment });
  } catch (err) {
    if (err instanceof OrderLookupError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Self-courier ship error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
