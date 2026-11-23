import { productMasterClient } from './productMaster.client.js';
import { PMProductSummary, PMProductDetail } from './productMaster.types.js';
import { ProductData } from '../../types/index.js';
import { dbStore } from '../../data/dbStore.js';

export class ProductMasterService {
  /**
   * Helper to map PM Department to local SPAR Department ID
   */
  private resolveDepartmentId(pmDept: string | null, requestedDeptId?: string): string {
    if (requestedDeptId) return requestedDeptId;
    if (!pmDept) return 'dept-food-002';

    const upper = pmDept.toUpperCase();
    if (upper.includes('FRESH') || upper.includes('BAKERY') || upper.includes('MEAT') || upper.includes('PRODUCE')) {
      return 'dept-fresh-001';
    }
    if (upper.includes('GROCER') || upper.includes('FOOD') || upper.includes('BEVERAGE') || upper.includes('EDIBLE')) {
      return 'dept-food-002';
    }
    return 'dept-nonfood-003';
  }

  /**
   * Maps PM product to SPAR system ProductData
   */
  public mapToProductData(pm: PMProductSummary | PMProductDetail, departmentId?: string): ProductData {
    const retailPrice = pm.selling_price ? parseFloat(pm.selling_price) : 0;
    const detail = pm as PMProductDetail;
    const baseCost = detail.list_cost ? parseFloat(detail.list_cost) : parseFloat((retailPrice * 0.75).toFixed(2));
    const vatRate = detail.vat_active === false ? 0.0 : 15.0;

    return {
      id: `pm-${pm.pro_code}`,
      sku: pm.pro_code,
      barcode: pm.barcode || null,
      name: pm.product_description || `Product ${pm.pro_code}`,
      category: pm.sub_department || pm.product_class || pm.department || 'General',
      departmentId: this.resolveDepartmentId(pm.department, departmentId),
      baseCost: isNaN(baseCost) ? 0 : baseCost,
      retailPrice: isNaN(retailPrice) ? 0 : retailPrice,
      vatRate,
      uom: pm.uom_desc || 'EA',
      isActive: pm.supplier_order_active !== false,
      dcCode: pm.dc_code ?? null,
      departmentName: pm.department ?? null,
      subDepartment: pm.sub_department ?? null,
      productClass: pm.product_class ?? null,
      segment: detail.segment ?? null,
      brand: pm.brand ?? null,
      supplierName: detail.suppliers?.[0]?.supplier_name ?? null,
      supplierCode: detail.suppliers?.[0]?.supplier_code ?? null,
      caseSize: pm.case_size ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Search Product Master and sync found products to local store.
   * Supports searching by exact DC code, exact product code (padded/unpadded numeric) and text description.
   */
  public async searchProducts(query: string, departmentId?: string, limit = 20): Promise<ProductData[]> {
    const clean = query.trim();
    const products: ProductData[] = [];
    const seenCodes = new Set<string>();

    // 1. Exact DC code match if query is numeric. Keep only rows whose dc_code really matches:
    //    a Product Master build without the dc_code filter ignores the parameter and returns any products.
    if (/^\d{2,10}$/.test(clean)) {
      try {
        const dcRes = await productMasterClient.searchProducts({ dc_code: clean, limit });
        for (const item of dcRes.items) {
          if (item.dc_code === clean && !seenCodes.has(item.pro_code)) {
            const product = this.mapToProductData(item, departmentId);
            products.push(product);
            seenCodes.add(item.pro_code);
            await dbStore.upsertProduct(product);
          }
        }
      } catch {
        // DC code search unavailable, continue with product code and text search
      }
    }

    // 2. Direct code lookup if query is numeric (up to 8 digits)
    if (/^\d{1,8}$/.test(clean)) {
      try {
        const direct = await this.getProductByCode(clean, departmentId);
        if (direct && !seenCodes.has(direct.sku)) {
          products.push(direct);
          seenCodes.add(direct.sku);
        }
      } catch {
        // Direct code lookup not found, continue to text search
      }
    }

    // 3. Query Product Master catalog (if empty or length >= 2)
    if (clean.length === 0 || clean.length >= 2) {
      try {
        const pmRes = await productMasterClient.searchProducts({
          q: clean.length >= 2 ? clean : undefined,
          limit,
        });

        for (const item of pmRes.items) {
          if (!seenCodes.has(item.pro_code)) {
            const product = this.mapToProductData(item, departmentId);
            products.push(product);
            seenCodes.add(item.pro_code);
            await dbStore.upsertProduct(product);
          }
        }
      } catch (err) {
        // Fallback to local store if Product Master returns an error
        const local = await dbStore.findProducts({ departmentId, search: clean, limit });
        for (const lp of local) {
          if (!seenCodes.has(lp.sku)) {
            products.push(lp);
            seenCodes.add(lp.sku);
          }
        }
      }
    } else {
      // 1-character query: lookup in local store to prevent 400 from external PM API
      const local = await dbStore.findProducts({ departmentId, search: clean, limit });
      for (const lp of local) {
        if (!seenCodes.has(lp.sku)) {
          products.push(lp);
          seenCodes.add(lp.sku);
        }
      }
    }

    return products;
  }

  /**
   * Lookup product details by product code from Product Master.
   */
  public async getProductByCode(proCode: string, departmentId?: string): Promise<ProductData | null> {
    try {
      const detail = await productMasterClient.getProductByCode(proCode);
      if (detail) {
        const product = this.mapToProductData(detail, departmentId);
        await dbStore.upsertProduct(product);
        return product;
      }
    } catch {
      // Fallback to local store if Product Master client throws
    }

    // Local fallback check
    const local = await dbStore.findProductById(proCode);
    if (local) return local;

    const padded = proCode.padStart(8, '0');
    const localPadded = await dbStore.findProductById(padded);
    return localPadded || null;
  }

  /**
   * Validate that a product code or ID is a genuine Product Master item.
   */
  public async validateProduct(codeOrId: string): Promise<boolean> {
    const code = codeOrId.startsWith('pm-') ? codeOrId.replace('pm-', '') : codeOrId;
    try {
      const detail = await productMasterClient.getProductByCode(code);
      if (detail !== null) return true;
    } catch {
      // Continue to local fallback
    }

    const local = await dbStore.findProductById(code);
    return local !== null;
  }
}

export const productMasterService = new ProductMasterService();
