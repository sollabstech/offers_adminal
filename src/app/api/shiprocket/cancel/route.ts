import { NextRequest, NextResponse } from "next/server";
import { getDocData, updateDocData } from "@/lib/firebase-server";
import { cancelOrders, ShiprocketError } from "@/lib/shiprocket";
import type { Order } from "@/types";

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

    if (shipment?.shippingMethod !== "self") {
      if (!shipment?.shiprocketOrderId) {
        return NextResponse.json({ error: "This vendor's shipment was never shipped via Shiprocket." }, { status: 400 });
      }
      await cancelOrders([shipment.shiprocketOrderId]);
    }

    const updatedShipments = shipments.map((s) => {
      if (s.vendorId !== vendorId) return s;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { error, ...rest } = s;
      return { ...rest, status: "cancelled" as const };
    });
    const shippingCharge = updatedShipments
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + (s.finalCharge ?? 0), 0);

    await updateDocData("orders", orderId, {
      shipments: updatedShipments,
      shippingCharge,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ cancelled: true });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket cancel error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
