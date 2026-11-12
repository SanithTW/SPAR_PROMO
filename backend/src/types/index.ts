import { Request } from 'express';
import { RoleType, PromoStatus, PromoType } from '@prisma/client';

export interface UserTokenPayload {
  id: string;
  email: string;
  role: RoleType;
  departmentId: string | null;
  name: string;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export interface DepartmentData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  headId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: RoleType;
  departmentId?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductData {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  departmentId: string;
  baseCost: number;
  retailPrice: number;
  vatRate: number;
  uom: string;
  isActive: boolean;
  // Product Master hierarchy & supplier (present when sourced from the real Product Master API)
  departmentName?: string | null;
  subDepartment?: string | null;
  productClass?: string | null;
  segment?: string | null;
  brand?: string | null;
  supplierName?: string | null;
  supplierCode?: string | null;
  caseSize?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PromoLineData {
  id: string;
  promoListId: string;
  productId: string;
  product?: ProductData;
  promoPrice: number;
  /** Head's per-line review comment (shown to staff on rejected/returned lines). */
  headComment?: string | null;
  /** Head's per-line decision from the latest review. */
  headDecision?: 'APPROVED' | 'REJECTED' | null;
  promoDiscount?: number | null;
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
  // Authoritative server-calculated metrics
  discountAmount?: number;
  discountPercent?: number;
  netCost?: number;
  marginAmount?: number;
  marginPercent?: number;
  forecastRevenue?: number;
  forecastMargin?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApprovalData {
  id: string;
  promoListId: string;
  reviewerId: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
    role: RoleType;
  };
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REOPENED';
  comments?: string | null;
  createdAt: Date;
}

export interface PromoListData {
  id: string;
  promoCode: string;
  title: string;
  promoType: PromoType;
  startDate: Date;
  endDate: Date;
  status: PromoStatus;
  version: number;
  notes?: string | null;
  rejectionReason?: string | null;
  createdById: string;
  departmentId: string;
  department?: DepartmentData;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
  };
  headApproverId?: string | null;
  headApprover?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
  };
  headApprovedAt?: Date | null;
  submittedAt?: Date | null;
  promoLines?: PromoLineData[];
  approvals?: ApprovalData[];
  totalVolume?: number;
  totalRevenue?: number;
  totalMargin?: number;
  blendedMarginPercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardSummaryResponse {
  drafts: number;
  waitingForMe: number;
  rejected: number;
  approved: number;
  role: RoleType;
  departmentName?: string | null;
}

export type NotificationEventType =
  | 'PROMO_SUBMITTED'
  | 'PROMO_REJECTED'
  | 'PROMO_APPROVED'
  | 'PROMO_REOPENED';

export interface NotificationData {
  id: string;
  userId: string;
  promoListId?: string | null;
  type: NotificationEventType | string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: Date;
  readAt?: Date | null;
}

export { RoleType, PromoStatus, PromoType };

