export const PAYROLL_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const USER_ROLES = ["BURUH", "SUPIR_TRUK", "MANDOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TOP_UP_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;
export type TopUpStatus = (typeof TOP_UP_STATUSES)[number];

export const PAYMENT_HEADER_ROLES = [...USER_ROLES, "ADMIN"] as const;
export type PaymentHeaderRole = (typeof PAYMENT_HEADER_ROLES)[number];

export type PaymentApiErrorResponse = {
  timestamp?: string;
  status: number;
  error: string;
  fieldErrors?: Record<string, string>;
};

export type Wallet = {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type Payroll = {
  id: string;
  userId: string;
  userRole: UserRole;
  amount: number;
  kilogram: number;
  description: string;
  status: PayrollStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollFilters = {
  status?: PayrollStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

export type CreatePayrollPayload = {
  userId: string;
  userRole: UserRole;
  kilogram: number;
  description?: string;
};

export type WageConfig = {
  id: string;
  buruhWagePerKg: number;
  supirTrukWagePerKg: number;
  mandorWagePerKg: number;
  updatedAt: string;
};

export type UpdateWageConfigPayload = {
  buruhWagePerKg: number;
  supirTrukWagePerKg: number;
  mandorWagePerKg: number;
};

export type TopUpPayload = {
  userId: string;
  amountRupiah: number;
};

export type TopUpResponse = {
  id: string;
  userId: string;
  amountRupiah: number;
  amountSawitDollar: number;
  paymentGatewayRef: string;
  paymentUrl: string;
  status: TopUpStatus;
  createdAt: string;
};

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function isPayrollStatus(value: string): value is PayrollStatus {
  return PAYROLL_STATUSES.includes(value as PayrollStatus);
}

export function isPaymentHeaderRole(value: string): value is PaymentHeaderRole {
  return PAYMENT_HEADER_ROLES.includes(value as PaymentHeaderRole);
}
