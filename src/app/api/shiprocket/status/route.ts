import { NextResponse } from "next/server";
import { getShiprocketConfig } from "@/lib/firebase-server";
import { testConnection, getPickupLocations, ShiprocketError } from "@/lib/shiprocket";

// GET — connection/authentication status for the Admin Settings page.
// Always attempts a fresh login so it reflects whatever is currently saved,
// not a cached token from a previous check.
export async function GET() {
  const config = await getShiprocketConfig();
  if (!config) {
    return NextResponse.json({ configured: false, authenticated: false });
  }
  if (!config.pickupLocation || !config.pickupPincode) {
    return NextResponse.json({
      configured: true,
      authenticated: null,
      warning: "Credentials saved, but Pickup Location / Pickup Pincode are still empty.",
    });
  }

  try {
    const result = await testConnection();

    // Cross-check the saved Pickup Location nickname against what's actually
    // registered on Shiprocket's side — a mismatch here is a common cause of
    // order-creation failures that Shiprocket reports with a confusing,
    // unrelated-sounding error message.
    let registeredPickupLocations: string[] = [];
    let pickupLocationMatches: boolean | null = null;
    try {
      const pickupRes = await getPickupLocations();
      registeredPickupLocations = (pickupRes.data?.shipping_address ?? []).map((a) => a.pickup_location);
      pickupLocationMatches = registeredPickupLocations.some(
        (name) => name.trim().toLowerCase() === config.pickupLocation.trim().toLowerCase()
      );
    } catch {
      // Non-fatal — connection status itself already succeeded above.
    }

    return NextResponse.json({
      configured: true,
      authenticated: true,
      ...result,
      savedPickupLocation: config.pickupLocation,
      pickupLocationMatches,
      registeredPickupLocations,
    });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return NextResponse.json({ configured: true, authenticated: false, error: err.message });
    }
    return NextResponse.json({ configured: true, authenticated: false, error: "Could not reach Shiprocket." });
  }
}
