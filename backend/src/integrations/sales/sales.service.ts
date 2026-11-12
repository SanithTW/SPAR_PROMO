import { salesClient } from './sales.client.js';
import { ProductSalesSummary, SalesFilterParams, SalesLineResponse } from './sales.types.js';

const PAGE_SIZE = 500;
const MAX_LINES = 20000; // safety cap per product lookup

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class SalesService {
  /**
   * Aggregate actual sales data for a product code into a clean summary.
   *
   * Returns null when the product has no sales history (or the Sales API is unreachable),
   * so the UI can say so instead of showing invented figures.
   *
   * Metrics are anchored on the latest month that has recorded sales for this product:
   *  - previousMonthQty: units sold in that month
   *  - lastYearQty:      units sold in the same month one year earlier
   *  - avg3MonthsQty:    average monthly units over the 3 calendar months ending at that month
   *                      (months with no sales count as 0)
   */
  public async getProductSalesSummary(productCode: string): Promise<ProductSalesSummary | null> {
    const cleanCode = productCode.trim().padStart(8, '0');

    const lines: SalesLineResponse[] = [];
    let total = 0;
    try {
      let offset = 0;
      for (;;) {
        const page = await salesClient.getSalesLines({ product_code: cleanCode, limit: PAGE_SIZE, offset });
        total = page.total ?? total;
        lines.push(...(page.items || []));
        offset += page.items?.length || 0;
        if (!page.items?.length || offset >= total || offset >= MAX_LINES) break;
      }
    } catch {
      return null;
    }

    if (lines.length === 0) return null;

    let totalQuantity = 0;
    let totalValue = 0;
    const monthlyQty: Record<string, number> = {};
    let firstSaleDate = '';
    let lastSaleDate = '';

    for (const line of lines) {
      const q = parseFloat(line.qty) || 0;
      const amt = parseFloat(line.amount) || 0;
      totalQuantity += q;
      totalValue += amt;

      const date = line.invoice_date ? line.invoice_date.substring(0, 10) : '';
      if (date) {
        const ym = date.substring(0, 7);
        monthlyQty[ym] = (monthlyQty[ym] || 0) + q;
        if (!firstSaleDate || date < firstSaleDate) firstSaleDate = date;
        if (!lastSaleDate || date > lastSaleDate) lastSaleDate = date;
      }
    }

    const anchor = lastSaleDate ? lastSaleDate.substring(0, 7) : '';
    const qtyIn = (ym: string) => monthlyQty[ym] || 0;
    const lastYearMonth = anchor ? shiftMonth(anchor, -12) : '';
    const avgMonths = anchor ? [shiftMonth(anchor, -2), shiftMonth(anchor, -1), anchor] : [];

    const previousMonthQty = anchor ? Math.round(qtyIn(anchor)) : 0;
    const lastYearQty = anchor ? Math.round(qtyIn(lastYearMonth)) : 0;
    const avg3MonthsQty = avgMonths.length
      ? Math.round(avgMonths.reduce((s, m) => s + qtyIn(m), 0) / avgMonths.length)
      : 0;

    const averagePrice = totalQuantity > 0 ? parseFloat((totalValue / totalQuantity).toFixed(2)) : 0;

    const recentSalesLines = [...lines]
      .sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || ''))
      .slice(0, 10)
      .map((l) => ({
        invoiceNumber: l.invoice_number,
        invoiceDate: l.invoice_date,
        locationDesc: l.location_desc,
        qty: parseFloat(l.qty) || 0,
        sellingPrice: parseFloat(l.selling_price) || 0,
        amount: parseFloat(l.amount) || 0,
      }));

    return {
      productCode: cleanCode,
      productDesc: lines[0].product_desc || `Product ${cleanCode}`,
      totalTransactions: total || lines.length,
      totalQuantitySold: parseFloat(totalQuantity.toFixed(2)),
      totalSalesValue: parseFloat(totalValue.toFixed(2)),
      averageSellingPrice: averagePrice,
      previousMonthQty,
      lastYearQty,
      avg3MonthsQty,
      salesNet: parseFloat(totalValue.toFixed(2)),
      periods: {
        previousMonth: anchor,
        lastYear: lastYearMonth,
        avg3Months: avgMonths,
        firstSaleDate,
        lastSaleDate,
      },
      monthlyQty,
      recentSalesLines,
    };
  }


  /**
   * Query raw sales lines with filters
   */
  public async querySales(params: SalesFilterParams) {
    return salesClient.getSalesLines(params);
  }
}

export const salesService = new SalesService();
