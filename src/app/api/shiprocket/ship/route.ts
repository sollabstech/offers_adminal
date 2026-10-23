import { NextRequest, NextResponse } from "next/server";
import { updateDocData, getShippingRules, getShiprocketConfig } from "@/lib/firebase-server";
import { createOrder, assignAWB, ShiprocketError, type CreateShiprocketOrderPayload } from "@/lib/shiprocket";
import { buildOrderShipmentGroups, isCOD, OrderLookupError } from "@/lib/shiprocket-order";
import { computeShippingCharge } from "@/lib/shipping-pricing";
import type { Order, OrderShipment } from "@/types";

function formatOrderDate(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, vendorId, courierId, shiprocketRate } = (await req.json()) as {
      orderId?: string;
      vendorId?: string;
      courierId?: number | string;
      /** Rate for the chosen courier, as returned by GET /couriers moments earlier. */
      shiprocketRate?: number;
    };
    if (!orderId || !vendorId) {
      return NextResponse.json({ error: "orderId and vendorId are required" }, { status: 400 });
    }

    const { order, deliveryAddress, groups } = await buildOrderShipmentGroups(orderId);
    const group = groups.find((g) => g.vendorId === vendorId);
    if (!group) {
      return NextResponse.json({ error: `No items for vendor ${vendorId} on this order` }, { status: 404 });
    }

    const existingShipments = order.shipments ?? [];
    const already = existingShipments.find((s) => s.vendorId === vendorId);
    if (already?.status === "shipped" && already.awbCode) {
      return NextResponse.json(
        { error: `This vendor's shipment already has an AWB assigned.`, awbCode: already.awbCode },
        { status: 409 }
      );
    }

    if (!group.pickupPincode || !group.pickupLocation) {
      return NextResponse.json(
        {
          error:
            group.vendorId === "__offerss__"
              ? "Shiprocket is not configured. Add your email/password + pickup details in Admin → Settings → Shiprocket Shipping."
              : `${group.vendorName} has no pickup pincode / Shiprocket pickup location set yet. The admin adds these on the vendor's profile (Vendors → Edit). Use Self Ship meanwhile.`,
        },
        { status: 400 }
      );
    }

    const cod = isCOD(order.paymentMethod);
    const shiprocketConfig = await getShiprocketConfig();

    let shiprocketOrderId: number;
    let shiprocketShipmentId: number;
    let awbCode: string | null | undefined;
    let courierName: string | null | undefined;

    // If an earlier attempt already created this shipment in Shiprocket but
    // AWB assignment failed, reuse those ids instead of calling createOrder()
    // again — Shiprocket's own docs warn that re-submitting the same order_id
    // to /orders/create/adhoc "does not change or affect the existing order",
    // so a retry would silently no-op (or hit a stricter update-path
    // validation) instead of actually creating anything new.
    if (already?.shiprocketOrderId && already?.shiprocketShipmentId && !already.awbCode) {
      shiprocketOrderId = already.shiprocketOrderId;
      shiprocketShipmentId = already.shiprocketShipmentId;
    } else {
      const payload: CreateShiprocketOrderPayload = {
        // Unique per vendor-shipment: Shiprocket order_id must be unique per account.
        order_id: `${order.id}-${vendorId}`.slice(0, 40),
        order_date: formatOrderDate(),
        pickup_location: group.pickupLocation,
        // channel_id is documented as `integer` — the Settings form stores it as text.
        ...(shiprocketConfig?.channelId ? { channel_id: Number(shiprocketConfig.channelId) } : {}),
        billing_customer_name: deliveryAddress.fullName,
        billing_address: deliveryAddress.line1,
        billing_address_2: deliveryAddress.line2 ?? "",
        billing_city: deliveryAddress.city,
        // Shiprocket's docs declare these as `integer` (their own examples use bare numbers) —
        // sending them as strings has been a source of rejected/oddly-validated orders for other integrators.
        billing_pincode: Number(deliveryAddress.postalCode),
        billing_state: deliveryAddress.state,
        billing_country: deliveryAddress.country || "India",
        billing_email: order.userEmail || "customer@offerss.com",
        billing_phone: Number((deliveryAddress.phone || order.userPhone || "9999999999").replace(/\D/g, "").slice(-10)),
        shipping_is_billing: true,
        order_items: group.items.map((item) => ({
          name: item.productName,
          sku: item.productId,
          units: item.quantity,
          selling_price: item.price,
        })),
        payment_method: cod ? "COD" : "Prepaid",
        sub_total: group.items.reduce((s, i) => s + i.price * i.quantity, 0),
        length: group.length,
        breadth: group.breadth,
        height: group.height,
        weight: group.weight,
      };

      const created = await createOrder(payload);
      shiprocketOrderId = created.order_id;
      shiprocketShipmentId = created.shipment_id;
      awbCode = created.awb_code;
      courierName = created.courier_name;
    }

    if (!awbCode) {
      try {
        const assigned = (await assignAWB(shiprocketShipmentId, courierId)) as {
          response?: { data?: { awb_code?: string; courier_name?: string } };
        };
        awbCode = assigned.response?.data?.awb_code ?? null;
        courierName = assigned.response?.data?.courier_name ?? courierName;
      } catch (err) {
        const partial: OrderShipment = {
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
          usedEstimatedPackage: group.usedEstimatedPackage,
          paymentMethod: cod ? "COD" : "Prepaid",
          status: "shipped",
          shiprocketOrderId,
          shiprocketShipmentId,
          error: err instanceof Error ? err.message : "AWB assignment failed",
        };
        await saveShipment(order, existingShipments, partial);
        return NextResponse.json(
          {
            error: `Order created in Shiprocket (#${shiprocketOrderId}) but courier/AWB assignment failed: ${
              err instanceof Error ? err.message : "unknown error"
            }. You can retry assignment from the Shiprocket dashboard.`,
          },
          { status: 502 }
        );
      }
    }

    const rules = await getShippingRules();
    const rate = shiprocketRate ?? 0;
    const pricing = computeShippingCharge(rate, { vendorId, courierName: courierName ?? undefined, isCOD: cod }, rules);

    const shipment: OrderShipment = {
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
      usedEstimatedPackage: group.usedEstimatedPackage,
      paymentMethod: cod ? "COD" : "Prepaid",
      courierId: typeof courierId === "number" ? courierId : Number(courierId) || undefined,
      courierName: courierName ?? undefined,
      shiprocketRate: rate,
      marginType: pricing.marginType,
      marginValue: pricing.marginValue,
      marginAmount: pricing.marginAmount,
      codCharge: pricing.codCharge,
      finalCharge: pricing.finalCharge,
      status: "shipped",
      shiprocketOrderId,
      shiprocketShipmentId,
      awbCode: awbCode ?? undefined,
      trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : undefined,
    };

    await saveShipment(order, existingShipments, shipment);

    return NextResponse.json({
      orderId: shiprocketOrderId,
      shipmentId: shiprocketShipmentId,
      awbCode,
      courierName,
      finalCharge: pricing.finalCharge,
      trackingUrl: shipment.trackingUrl,
    });
  } catch (err) {
    if (err instanceof OrderLookupError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ShiprocketError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Shiprocket ship error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Upsert one vendor's shipment into order.shipments[] and recompute the order's total shipping charge. */
async function saveShipment(order: Order, existing: OrderShipment[], shipment: OrderShipment) {
  const shipments = [...existing.filter((s) => s.vendorId !== shipment.vendorId), shipment];
  const shippingCharge = shipments.reduce((sum, s) => sum + (s.finalCharge ?? 0), 0);
  await updateDocData("orders", order.id, {
    status: "shipped",
    shipments,
    shippingCharge,
    updatedAt: new Date().toISOString(),
  });
}
