// client/src/types/search.ts
export interface SearchFilters {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface SearchSuggestion {
  _id: string;
  name: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  storeId: string;
  imageUrl?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance?: number;
  createdAt?: string;
  updatedAt?: string;
  // ✅ Module 4: Promotions
  isPromoted?: boolean;
  isCurrentlyPromoted?: boolean;
  adBudget?: number;
  promotedUntil?: string;
}

export interface SearchSuggestion {
    _id: string;
    name: string;
    type: string;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}