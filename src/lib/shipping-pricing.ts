/**
 * Pure shipping-charge calculator — no I/O, so it's trivial to reason about
 * and unit-test. Given the real Shiprocket rate for a shipment plus the
 * admin's configured pricing policy, works out what to actually charge.
 *
 * Precedence for which margin rule applies: courier-specific > vendor-specific
 * > platform default. Only one is used — they don't stack.
 */
import type { MarginRule, ShippingRules } from "@/types";

export interface PricingResult {
  shiprocketRate: number;
  marginType: MarginRule["marginType"];
  marginValue: number;
  marginAmount: number;
  codCharge: number;
  /** shiprocketRate + marginAmount + codCharge, clamped to [minCharge, maxCharge]. */
  finalCharge: number;
}

function marginAmountFor(rate: number, rule: MarginRule): number {
  return rule.marginType === "percentage" ? Math.round((rate * rule.marginValue) / 100) : rule.marginValue;
}

export function computeShippingCharge(
  shiprocketRate: number,
  opts: { vendorId?: string; courierName?: string; isCOD: boolean },
  rules: ShippingRules
): PricingResult {
  const rule: MarginRule =
    (opts.courierName && rules.courierMargins?.[opts.courierName]) ||
    (opts.vendorId && rules.vendorMargins?.[opts.vendorId]) ||
    rules.defaultMargin;

  const marginAmount = Math.max(0, marginAmountFor(shiprocketRate, rule));
  const codCharge = opts.isCOD ? Math.max(0, rules.codCharge || 0) : 0;

  let finalCharge = Math.round(shiprocketRate + marginAmount + codCharge);
  if (rules.minCharge != null) finalCharge = Math.max(finalCharge, rules.minCharge);
  if (rules.maxCharge != null) finalCharge = Math.min(finalCharge, rules.maxCharge);

  return {
    shiprocketRate,
    marginType: rule.marginType,
    marginValue: rule.marginValue,
    marginAmount,
    codCharge,
    finalCharge,
  };
}
