import { NextRequest, NextResponse } from "next/server";
import { checkServiceability, ShiprocketError } from "@/lib/shiprocket";
import { getShiprocketConfig } from "@/lib/firebase-server";

// POST { deliveryPincode, weight?, cod? } — pickup pincode comes from the
// configured pickup location's Shiprocket profile, so we just need delivery here.
export async function POST(req: NextRequest) {
  try {
    const { pickupPincode, deliveryPincode, weight = 0.5, cod = false } = (await req.json()) as {
      pickupPincode?: string | number;
      deliveryPincode?: string | number;
      weight?: number;
      cod?: boolean;
    };

    if (!deliveryPincode) {
      return NextResponse.json({ error: "deliveryPincode is required" }, { status: 400 });
    }

    let pickup = pickupPincode;
    if (!pickup) {
      const config = await getShiprocketConfig();
      if (!config) {
        return NextResponse.json(
          { error: "Shiprocket is not configured. Add your email/password in Admin → Settings → Shiprocket Shipping." },
          { status: 503 }
        );
      }
      pickup = config.pickupPincode;
      if (!pickup) {
        return NextResponse.json(
          { error: "No Pickup Pincode set in Admin → Settings → Shiprocket Shipping." },
          { status: 400 }
        );
      }
    }

    const data = await checkServiceability({
      pickup_postcode: pickup,
      delivery_postcode: deliveryPincode,
      weight,
      cod: cod ? 1 : 0,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket serviceability error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
