import { PromoStatus, RoleType, PromoType } from '@prisma/client';
import { dbStore } from '../data/dbStore.js';
import { PromoListData, UserTokenPayload } from '../types/index.js';
import * as productService from './productService.js';

export interface PromoFilterOptions {
  status?: PromoStatus;
  departmentId?: string;
  userId?: string;
  userRole?: RoleType;
}

export async function getPromoLists(filter: PromoFilterOptions): Promise<PromoListData[]> {
  const promos = await dbStore.findPromoLists(filter);

  // Return each with its lines attached if available
  const results = await Promise.all(
    promos.map(async (p) => {
      const full = await dbStore.findPromoById(p.id);
      return full || p;
    })
  );

  return results;
}

export async function getPromoById(id: string): Promise<PromoListData | null> {
  const promo = await dbStore.findPromoById(id);
  if (!promo) return null;

  const dept = await dbStore.findDepartmentById(promo.departmentId);
  const creator = await dbStore.findUserById(promo.createdById);

  return {
    ...promo,
    department: dept || undefined,
    creator: creator
      ? {
          id: creator.id,
          firstName: creator.firstName,
          lastName: creator.lastName,
          name: creator.name,
          email: creator.email,
        }
      : undefined,
  } as unknown as PromoListData;
}

export async function createPromoList(
  data: {
    title: string;
    promoType?: PromoType;
    startDate: string | Date;
    endDate: string | Date;
    notes?: string | null;
    departmentId?: string;
    lines?: Array<{
      productId: string;
      promoPrice: number;
      dealCost?: number | null;
      scanDiscount?: number | null;
      fundingMechanism?: string | null;
      rebateAmount?: number | null;
      estimatedVolume?: number | null;
      mechanic?: string | null;
      displayType?: string | null;
      featurePosition?: string | null;
      coopSupport?: number | null;
      notes?: string | null;
    }>;
  },
  user: UserTokenPayload
): Promise<PromoListData> {
  // Validate products against Product Master / local catalog before saving
  if (data.lines && data.lines.length > 0) {
    for (const line of data.lines) {
      const prod = await productService.getProductById(line.productId);
      if (!prod) {
        throw new Error(`Product ${line.productId} not found in Product Master catalog.`);
      }
    }
  }

  return dbStore.createPromoList(data, {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  });
}

export async function updatePromoList(
  id: string,
  data: {
    title?: string;
    promoType?: PromoType;
    startDate?: string | Date;
    endDate?: string | Date;
    notes?: string | null;
    lines?: Array<{
      productId: string;
      promoPrice: number;
      dealCost?: number | null;
      scanDiscount?: number | null;
      fundingMechanism?: string | null;
      rebateAmount?: number | null;
      estimatedVolume?: number | null;
      mechanic?: string | null;
      displayType?: string | null;
      featurePosition?: string | null;
      coopSupport?: number | null;
      notes?: string | null;
    }>;
  },
  user: UserTokenPayload
): Promise<PromoListData> {
  // Validate products against Product Master / local catalog before saving
  if (data.lines && data.lines.length > 0) {
    for (const line of data.lines) {
      const prod = await productService.getProductById(line.productId);
      if (!prod) {
        throw new Error(`Product ${line.productId} not found in Product Master catalog.`);
      }
    }
  }

  return dbStore.updatePromoList(id, data, {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  });
}

export async function submitPromoList(id: string, user: UserTokenPayload): Promise<PromoListData> {
  return dbStore.submitPromoList(id, {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  });
}

export async function deletePromoList(id: string, user: UserTokenPayload): Promise<void> {
  return dbStore.deletePromoList(id, {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
  });
}
