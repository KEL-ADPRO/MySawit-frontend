export const KEBUN_VIEWER_ROLES = ["ADMIN", "MANDOR", "SUPIR_TRUK", "BURUH"] as const;
export type KebunViewerRole = (typeof KEBUN_VIEWER_ROLES)[number];

export type KebunCoordinate = {
  latitude: number;
  longitude: number;
};

export type KebunAssignment = {
  id: string;
  nama: string;
  userId?: string;
};

export type Kebun = {
  id: string;
  nama: string;
  kode: string;
  luas: number;
  koordinatTitikUjung: KebunCoordinate[];
  mandor: KebunAssignment | null;
  supirTruks: KebunAssignment[];
  createdAt?: string;
  updatedAt?: string;
};

export type KebunUpsertPayload = {
  nama: string;
  kode: string;
  luas: number;
  koordinatTitikUjung: KebunCoordinate[];
};

export type KebunApiErrorResponse = {
  timestamp?: string;
  status: number;
  error: string;
  fieldErrors?: Record<string, string>;
};

export type KebunFilters = {
  search?: string;
};

export function isKebunViewerRole(value: string): value is KebunViewerRole {
  return KEBUN_VIEWER_ROLES.includes(value as KebunViewerRole);
}

