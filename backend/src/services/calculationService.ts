import { ProductData, PromoLineData } from '../types/index.js';

export interface CalculatedLineMetrics {
  discountAmount: number;
  discountPercent: number;
  netCost: number;
  marginAmount: number;
  marginPercent: number;
  forecastRevenue: number;
  forecastMargin: number;
}

export interface CalculatedListTotals {
  totalLines: number;
  totalVolume: number;
  totalRevenue: number;
  totalMargin: number;
  blendedMarginPercent: number;
}

/**
 * Calculates authoritative server-side metrics for a single promo line.
 */
export function calculateLineMetrics(
  product: ProductData,
  line: {
    promoPrice: number;
    dealCost?: number | null;
    scanDiscount?: number | null;
    rebateAmount?: number | null;
    estimatedVolume?: number | null;
  }
): CalculatedLineMetrics {
  const normalRetail = Number(product.retailPrice) || 0;
  const baseCost = Number(product.baseCost) || 0;
  const vatRate =
    product.vatRate !== undefined && product.vatRate !== null && !isNaN(Number(product.vatRate))
      ? Number(product.vatRate)
      : 15.0;
  const promoPrice = Number(line.promoPrice) || 0;
  const volume = Number(line.estimatedVolume) || 0;

  // 1. Discount amount & percent
  const discountAmount = Math.max(0, Number((normalRetail - promoPrice).toFixed(2)));
  const discountPercent =
    normalRetail > 0 ? Number((((normalRetail - promoPrice) / normalRetail) * 100).toFixed(2)) : 0;

  // 2. Net cost (Supplier deal cost takes precedence, else base cost - rebate)
  let netCost: number;
  if (line.dealCost !== undefined && line.dealCost !== null && !isNaN(Number(line.dealCost))) {
    netCost = Math.max(0, Number(Number(line.dealCost).toFixed(2)));
  } else {
    const rebate = Number(line.rebateAmount) || 0;
    netCost = Math.max(0, Number((baseCost - rebate).toFixed(2)));
  }

  // 3. Margin (calculated on VAT-exclusive retail)
  const vatMultiplier = 1 + vatRate / 100;
  const retailExclVat = promoPrice > 0 ? promoPrice / vatMultiplier : 0;
  const marginAmount = Number((retailExclVat - netCost).toFixed(2));
  const marginPercent =
    retailExclVat > 0 ? Number(((marginAmount / retailExclVat) * 100).toFixed(2)) : 0;

  // 4. Forecasts
  const forecastRevenue = Number((promoPrice * volume).toFixed(2));
  const forecastMargin = Number((marginAmount * volume).toFixed(2));

  return {
    discountAmount,
    discountPercent,
    netCost,
    marginAmount,
    marginPercent,
    forecastRevenue,
    forecastMargin,
  };
}

/**
 * Calculates aggregated promotional campaign totals.
 */
export function calculatePromoTotals(lines: PromoLineData[]): CalculatedListTotals {
  let totalVolume = 0;
  let totalRevenue = 0;
  let totalMargin = 0;
  let totalRevenueExclVat = 0;

  for (const line of lines) {
    const vol = Number(line.estimatedVolume) || 0;
    const rev = Number(line.forecastRevenue) || 0;
    const mar = Number(line.forecastMargin) || 0;
    const prodVat = line.product?.vatRate;
    const vatRate = prodVat !== undefined && prodVat !== null && !isNaN(Number(prodVat)) ? Number(prodVat) : 15.0;

    totalVolume += vol;
    totalRevenue += rev;
    totalMargin += mar;
    if (rev > 0) {
      totalRevenueExclVat += rev / (1 + vatRate / 100);
    }
  }

  const blendedMarginPercent =
    totalRevenueExclVat > 0
      ? Number(((totalMargin / totalRevenueExclVat) * 100).toFixed(2))
      : 0;

  return {
    totalLines: lines.length,
    totalVolume,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalMargin: Number(totalMargin.toFixed(2)),
    blendedMarginPercent,
  };
}
