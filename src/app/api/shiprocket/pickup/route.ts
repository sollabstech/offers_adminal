import { NextRequest, NextResponse } from "next/server";
import { getDocData, updateDocData } from "@/lib/firebase-server";
import { requestPickup, ShiprocketError } from "@/lib/shiprocket";
import type { Order } from "@/types";

// POST { orderId, vendorId } — schedules/requests pickup with Shiprocket for
// one vendor's already-shipped (AWB assigned) shipment.
export async function POST(req: NextRequest) {
  try {
    const { orderId, vendorId } = (await req.json()) as { orderId?: string; vendorId?: string };
    if (!orderId || !vendorId) {
      return NextResponse.json({ error: "orderId and vendorId are required" }, { status: 400 });
    }

    const orderData = await getDocData("orders", orderId);
    if (!orderData) {
      return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 });
    }
    const order = { id: orderId, ...orderData } as Order;
    const shipments = order.shipments ?? [];
    const shipment = shipments.find((s) => s.vendorId === vendorId);

    if (!shipment?.shiprocketShipmentId) {
      return NextResponse.json({ error: "This vendor's shipment has no AWB yet — ship it first." }, { status: 400 });
    }
    if (shipment.pickupRequested) {
      return NextResponse.json({ error: "Pickup was already requested for this shipment." }, { status: 409 });
    }

    await requestPickup([shipment.shiprocketShipmentId]);

    const updatedShipments = shipments.map((s) =>
      s.vendorId === vendorId ? { ...s, pickupRequested: true, pickupRequestedAt: new Date().toISOString() } : s
    );
    await updateDocData("orders", orderId, { shipments: updatedShipments, updatedAt: new Date().toISOString() });

    return NextResponse.json({ pickupRequested: true });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket pickup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
