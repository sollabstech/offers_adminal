import { NextRequest, NextResponse } from "next/server";
import { checkServiceability, ShiprocketError } from "@/lib/shiprocket";
import { getShippingRules } from "@/lib/firebase-server";
import { buildOrderShipmentGroups, isCOD, OrderLookupError } from "@/lib/shiprocket-order";
import { computeShippingCharge } from "@/lib/shipping-pricing";

interface RawCourier {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  freight_charge: number;
  etd: string;
  cod: number;
  rating?: number;
}

function speedTierForETD(etd: string): "express" | "fast" | "standard" {
  const days = Math.ceil((new Date(etd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "express";
  if (days <= 4) return "fast";
  return "standard";
}

// GET /api/shiprocket/couriers?orderId=X&vendorId=Y — courier availability + rates
// + the admin's configured final charge for this vendor's shipment.
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");
    const vendorId = req.nextUrl.searchParams.get("vendorId");
    if (!orderId || !vendorId) {
      return NextResponse.json({ error: "orderId and vendorId query params are required" }, { status: 400 });
    }

    const { order, deliveryAddress, groups } = await buildOrderShipmentGroups(orderId);
    const group = groups.find((g) => g.vendorId === vendorId);
    if (!group) {
      return NextResponse.json({ error: `No items for vendor ${vendorId} on this order` }, { status: 404 });
    }
    if (!group.pickupPincode || !group.pickupLocation) {
      return NextResponse.json(
        {
          error:
            group.vendorId === "__offerss__"
              ? "Shiprocket is not configured. Add your email/password + pickup details in Admin → Settings → Shiprocket Shipping."
              : `${group.vendorName} has no Pincode / Pickup Location set. Add them on the vendor's profile.`,
        },
        { status: 400 }
      );
    }

    const cod = isCOD(order.paymentMethod);
    const data = (await checkServiceability({
      pickup_postcode: group.pickupPincode,
      delivery_postcode: deliveryAddress.postalCode,
      weight: group.weight,
      cod: cod ? 1 : 0,
    })) as { data?: { available_courier_companies?: RawCourier[] } };

    const raw = data.data?.available_courier_companies ?? [];
    const rules = await getShippingRules();

    const couriers = raw
      .map((c) => {
        const pricing = computeShippingCharge(c.rate ?? c.freight_charge, { vendorId, courierName: c.courier_name, isCOD: cod }, rules);
        return {
          courierId: c.courier_company_id,
          name: c.courier_name,
          etd: c.etd,
          codAvailable: c.cod === 1,
          speedTier: speedTierForETD(c.etd),
          ...pricing,
        };
      })
      .sort((a, b) => new Date(a.etd).getTime() - new Date(b.etd).getTime());

    return NextResponse.json({
      orderId,
      vendorId,
      vendorName: group.vendorName,
      weight: group.weight,
      pickupPincode: group.pickupPincode,
      deliveryPincode: deliveryAddress.postalCode,
      usedEstimatedPackage: group.usedEstimatedPackage,
      cod,
      couriers,
    });
  } catch (err) {
    if (err instanceof OrderLookupError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ShiprocketError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Shiprocket couriers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
