export interface SalesLineResponse {
  sales_line_id: number;
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  location_id: number;
  location_code: string;
  location_desc: string;
  member_id: number | null;
  member_code: string | null;
  product_id: number;
  product_code: string;
  product_desc: string;
  department: string;
  qty: string;
  selling_price: string;
  discount_percent: string;
  discount_amount: string;
  tax_rate: string | null;
  unit_price_exc_vat: string;
  total_amount_exc_vat: string;
  vat_amount: string | null;
  amount: string;
}

export interface SalesPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SalesFilterParams {
  product_code?: string;
  product_id?: number;
  date_from?: string;
  date_to?: string;
  location_code?: string;
  limit?: number;
  offset?: number;
}

export interface ProductSalesSummary {
  productCode: string;
  productDesc: string;
  totalTransactions: number;
  totalQuantitySold: number;
  totalSalesValue: number;
  averageSellingPrice: number;
  previousMonthQty?: number;
  lastYearQty?: number;
  avg3MonthsQty?: number;
  salesNet?: number;
  /** Which months the metrics above were computed from ('YYYY-MM'). */
  periods?: {
    previousMonth: string; // latest month with recorded sales for this product
    lastYear: string; // same month, one year earlier
    avg3Months: string[]; // the 3 calendar months ending at previousMonth
    firstSaleDate: string;
    lastSaleDate: string;
  };
  monthlyQty?: Record<string, number>;
  recentSalesLines: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    locationDesc: string;
    qty: number;
    sellingPrice: number;
    amount: number;
  }>;
}
