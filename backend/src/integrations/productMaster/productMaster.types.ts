export interface PMProductSummary {
  product_id: number;
  pro_code: string;
  dc_code?: string | null;
  product_description: string | null;
  case_size: number | null;
  uom_desc: string | null;
  supplier_order_active: boolean | null;
  dep_code: string | null;
  department: string | null;
  sub_department: string | null;
  product_class: string | null;
  brand: string | null;
  dc_order_status: string | null;
  selling_price: string | null;
  barcode: string | null;
}

export interface PMProductDetail extends PMProductSummary {
  list_cost: string | null;
  uom_code: string | null;
  vat_active: boolean | null;
  segment?: string | null;
  inner_case_size?: number | null;
  suppliers?: Array<{
    supplier_id: number;
    supplier_code: string;
    supplier_name: string;
  }>;
}

export interface PMPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PMSearchParams {
  q?: string;
  dep_code?: string;
  barcode?: string;
  dc_code?: string;
  supplier_order_active?: boolean;
  limit?: number;
  offset?: number;
}
