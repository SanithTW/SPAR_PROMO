export type RoleType = 'STAFF' | 'HEAD' | 'MARKETING' | 'ADMIN' | 'MASTER_DATA';

export type PromoStatus =
  | 'DRAFT'
  | 'SUBMITTED_TO_HEAD'
  | 'REJECTED_BY_HEAD'
  | 'APPROVED'
  | 'REOPENED';

export type PromoType =
  | 'WEEKLY_LEAFLET'
  | 'MONTHLY_CATALOGUE'
  | 'SEASONAL_CAMPAIGN'
  | 'INSTORE_SPECIAL'
  | 'CLEARANCE';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  headId?: string | null;
  head?: {
    id: string;
    name: string;
    email: string;
    role: RoleType;
  } | null;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
  departmentId?: string | null;
  department?: Department | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  departmentId: string;
  department?: Department;
  baseCost: number | string;
  retailPrice: number | string;
  vatRate: number | string;
  uom: string;
  isActive: boolean;
}

export interface PromoTypeOption {
  code: PromoType;
  name: string;
  description: string;
}

export interface PromoLine {
  id: string;
  promoListId?: string;
  productId: string;
  product?: Product;
  // 11 Editable / Input fields
  promoPrice: number;
  dealCost?: number | null;
  scanDiscount?: number | null;
  rebateAmount?: number | null;
  fundingMechanism?: string | null;
  estimatedVolume?: number | null;
  mechanic?: string | null;
  displayType?: string | null;
  featurePosition?: string | null;
  coopSupport?: number | null;
  notes?: string | null;
  // Head review (per line)
  headComment?: string | null;
  headDecision?: 'APPROVED' | 'REJECTED' | null;
  // Authoritative server & client calculated metrics
  promoDiscount?: number | null;
  discountAmount?: number;
  discountPercent?: number;
  netCost?: number;
  marginAmount?: number;
  marginPercent?: number;
  forecastRevenue?: number;
  forecastMargin?: number;
  // Special Promo 51-column extended fields
  food?: string;
  promo?: string;
  from?: string;
  to?: string;
  days?: number;
  dept?: string;
  subDept?: string;
  pClass?: string;
  segment?: string;
  dc?: string;
  pos?: string;
  barcode?: string;
  desc?: string;
  statusText?: string;
  nmrp?: number;
  normalMargin?: number;
  supDisc?: number;
  sparDisc?: number;
  finalCost?: number;
  sellingBeforeRound?: number;
  sellingAfterRound?: number;
  roundingMargin?: number;
  finalMargin?: number;
  savingOnNmrp?: number;
  savingOnMrpPct?: number;
  supplierName?: string;
  comment?: string;
  rank?: number;
  avg3Months?: number;
  previousMonth?: number;
  lastYear?: number;
  salesNet?: number;
  depQty?: number;
  subDepQty?: number;
  productClassQty?: number;
  segmentRank?: number;
  avgPromoQty?: number;
  avgPromoValue?: number;
  sparContributionBase?: number;
  incSales?: number;
  salesIncreasePct?: number;
  incSales5?: number;
  forecastedQty?: number;
  forecastedValue?: number;
  totalSavings?: number;
  supplierContribution?: number;
  sparContribution?: number;
  outlets?: string;
  tabloid?: string;
}

export interface SpecialPromoLine {
  id: string;
  food: string;
  promoType: string;
  from: string;
  to: string;
  days: number;
  dept: string;
  subDept: string;
  pClass: string;
  segment: string;
  dc: string;
  pos: string;
  barcode: string;
  desc: string;
  status: string;
  nmrp: number;
  normalMargin: number;
  supDisc: number;
  sparDisc: number;
  finalCost: number;
  sellingBeforeRound: number;
  sellingAfterRound: number;
  roundingMargin: number;
  finalMargin: number;
  savingOnNmrp: number;
  savingOnMrpPct: number;
  supplierName: string;
  comment: string;
  rank: number;
  avg3Months: number;
  avgPromoQty: number;
  avgPromoValue: number;
  sparContributionBase: number;
  incSales: number;
  salesIncreasePct: number;
  incSales5: number;
  forecastedQty: number;
  forecastedValue: number;
  totalSavings: number;
  supplierContribution: number;
  sparContribution: number;
  outlets: string;
  tabloid: string;
  productId?: string;
  product?: Product;
}

export interface Approval {
  id: string;
  promoListId: string;
  reviewerId: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: RoleType;
  };
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REOPENED';
  comments?: string | null;
  createdAt: string;
}

export interface PromoList {
  id: string;
  promoCode: string;
  title: string;
  promoType: PromoType;
  startDate: string;
  endDate: string;
  status: PromoStatus;
  version: number;
  notes?: string | null;
  rejectionReason?: string | null;
  createdById: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
  };
  departmentId: string;
  department?: Department;
  headApproverId?: string | null;
  headApprover?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  headApprovedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  promoLines?: PromoLine[];
  approvals?: Approval[];
  totalVolume?: number;
  totalRevenue?: number;
  totalMargin?: number;
  blendedMarginPercent?: number;
  _count?: {
    promoLines: number;
  };
}

export interface RecentPromoItem {
  id: string;
  promoCode: string;
  title: string;
  promoType: PromoType;
  status: PromoStatus;
  version: number;
  startDate: string;
  endDate: string;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  creator?: {
    id: string;
    name?: string;
    email: string;
  } | null;
  submittedAt?: string | null;
  headApprovedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  drafts: number;
  waitingForMe: number;
  rejected: number;
  approved: number;
  role: RoleType;
  departmentName?: string | null;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  promoListId?: string | null;
  title: string;
  message: string;
  type: 'PROMO_SUBMITTED' | 'PROMO_REJECTED' | 'PROMO_APPROVED' | 'PROMO_REOPENED' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' | string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  performedById?: string | null;
  performer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: RoleType;
  } | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}
