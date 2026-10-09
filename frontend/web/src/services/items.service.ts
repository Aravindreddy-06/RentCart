/**
 * src/services/items.service.ts
 * Items API calls.
 */

import api from './api';

export interface ItemOwner {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Item {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  pricePerDay: number;
  deposit: number;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
  owner: ItemOwner;
}

export interface ItemsResponse {
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ItemsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const itemsService = {
  async getItems(query: ItemsQuery = {}): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const res = await api.get(`/api/items?${params.toString()}`);
    return res.data.data;
  },
};
