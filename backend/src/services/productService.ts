import { dbStore } from '../data/dbStore.js';
import { ProductData } from '../types/index.js';
import { productMasterService } from '../integrations/productMaster/productMaster.service.js';

export async function getAllProducts(departmentId?: string, search?: string): Promise<ProductData[]> {
  return dbStore.findProducts({ departmentId, search });
}

export async function searchProducts(query: string, departmentId?: string, limit = 20): Promise<ProductData[]> {
  // Real Product Master API is the authoritative source for product search
  return productMasterService.searchProducts(query || '', departmentId, limit);
}

export async function getProductById(id: string): Promise<ProductData | null> {
  const local = await dbStore.findProductById(id);
  if (local) return local;

  const cleanCode = id.startsWith('pm-') ? id.replace('pm-', '') : id;
  return productMasterService.getProductByCode(cleanCode);
}
