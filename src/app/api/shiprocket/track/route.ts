import { NextRequest, NextResponse } from "next/server";
import { trackByAWB, ShiprocketError } from "@/lib/shiprocket";
import { getDocData, updateDocData } from "@/lib/firebase-server";
import type { Order } from "@/types";

interface TrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  "sr-status-label"?: string;
}

interface TrackingResponse {
  tracking_data?: {
    shipment_track_activities?: TrackingActivity[];
    track_status?: number;
  };
}

// GET /api/shiprocket/track?awb=XXXXXXXX — raw tracking lookup.
export async function GET(req: NextRequest) {
  try {
    const awb = req.nextUrl.searchParams.get("awb");
    if (!awb) {
      return NextResponse.json({ error: "awb query param is required" }, { status: 400 });
    }
    const data = await trackByAWB(awb);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket track error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST { orderId, vendorId } — refresh live status for one vendor's shipment
// on an order and persist it to Firestore.
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
    if (!shipment?.awbCode) {
      return NextResponse.json({ error: "This vendor's shipment has no AWB yet — ship it first." }, { status: 400 });
    }

    const data = (await trackByAWB(shipment.awbCode)) as TrackingResponse;
    const activities = data.tracking_data?.shipment_track_activities ?? [];
    const latest = activities[0];

    const status = latest?.["sr-status-label"] ?? latest?.status ?? latest?.activity ?? "In transit";
    const location = latest?.location ?? "";
    const lastUpdate = latest?.date ?? new Date().toISOString();

    const updatedShipments = shipments.map((s) =>
      s.vendorId === vendorId ? { ...s, deliveryStatus: status, lastLocation: location, lastUpdate } : s
    );
    await updateDocData("orders", orderId, { shipments: updatedShipments, updatedAt: new Date().toISOString() });

    return NextResponse.json({ status, location, lastUpdate });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket track error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
