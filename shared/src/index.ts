export type UserRole = "buyer" | "seller" | "driver" | "marketer" | "admin";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "rejected"
  | "ready_for_pickup"
  | "claimed"
  | "at_store"
  | "picked_up"
  | "on_the_way"
  | "delivered";

export type MoneyBDT = number;

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  neighborhood?: string;
  adPoints?: number;
}

export interface CartLine {
  productId: string;
  storeId: string;
  name: string;
  unitPrice: MoneyBDT;
  qty: number;
}

export interface Order {
  id: string;
  buyerId: string;
  lines: CartLine[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  storeIds: string[];
  delivery?: {
    driverId?: string;
    proof?: { pinLast4?: string; photoUrl?: string };
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface SearchFilters {
  keyword?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  lat?: number
  lng?: number
  radius?: number
  page?: number
  limit?: number
}

export interface SearchProduct {
  _id: string
  name: string
  description: string
  price: number
  category?: string
  storeId: string
  location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  distance?: number
  createdAt?: string
  updatedAt?: string
}

export interface SearchResponse {
  products: SearchProduct[]
  total: number
  page: number
  totalPages: number
}


export * from './types/search';