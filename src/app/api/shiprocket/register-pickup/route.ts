import { NextRequest, NextResponse } from "next/server";
import { getDocData, setDocData } from "@/lib/firebase-server";
import { addPickupLocation, ShiprocketError } from "@/lib/shiprocket";
import type { Vendor } from "@/types";

function slugifyNickname(name: string, vendorId: string): string {
  const base = (name || "vendor").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "Vendor";
  return `${base}_${vendorId.slice(-6)}`;
}

// POST { vendorId } — registers the vendor's structured pickup address as a
// new Pickup Location on the platform's Shiprocket account, then saves the
// nickname Shiprocket actually stored it under.
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = (await req.json()) as { vendorId?: string };
    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
    }

    const vendorData = await getDocData("vendors", vendorId);
    if (!vendorData) {
      return NextResponse.json({ error: `Vendor ${vendorId} not found` }, { status: 404 });
    }
    const vendor = vendorData as Vendor;

    const missing: string[] = [];
    if (!vendor.pickupContactName) missing.push("Contact Person");
    if (!vendor.pickupPhone) missing.push("Pickup Phone");
    if (!vendor.pickupAddressLine1) missing.push("Address Line 1");
    if (!vendor.pickupCity) missing.push("City");
    if (!vendor.pickupState) missing.push("State");
    if (!vendor.pincode) missing.push("Pincode");
    if (!vendor.email) missing.push("Email");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Fill in these fields on the vendor's profile first: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }

    const nickname = slugifyNickname(vendor.name, vendorId);

    const result = await addPickupLocation({
      pickup_location: nickname,
      name: vendor.pickupContactName!,
      email: vendor.email,
      phone: (vendor.pickupPhone ?? vendor.phone ?? "").replace(/\D/g, "").slice(-10),
      address: vendor.pickupAddressLine1!,
      address_2: vendor.pickupAddressLine2 ?? "",
      city: vendor.pickupCity!,
      state: vendor.pickupState!,
      country: vendor.pickupCountry || "India",
      pin_code: vendor.pincode!,
    });

    // Shiprocket sometimes normalizes the nickname (strips spaces/symbols) —
    // trust whatever it echoes back over what we sent.
    const savedNickname = result.address?.pickup_location || nickname;

    await setDocData("vendors", vendorId, { pickupLocationNickname: savedNickname });

    return NextResponse.json({ pickupLocationNickname: savedNickname });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Shiprocket register-pickup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
