/**
 * src/services/items.service.ts (mobile)
 * Items API calls matching backend JSON response structure.
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
  pricePerDay?: number;
  dailyRate?: number;
  deposit?: number;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  location?: string;
  locationName?: string;
  createdAt: string;
  updatedAt: string;
  owner?: ItemOwner;
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

export interface CreateItemInput {
  title: string;
  description: string;
  category: string;
  pricePerDay?: number;
  dailyRate?: number;
  location?: string;
  locationName?: string;
  images?: string[];
}

export const itemsService = {
  async getItems(query: ItemsQuery = {}): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const url = `/items?${params.toString()}`;
    console.log('📱 Mobile Items Request URL:', url);

    const res = await api.get(url);
    console.log('📱 Mobile Items Response Status:', res.status);
    console.log('📱 Mobile Items Response Data:', JSON.stringify(res.data, null, 2));

    return res.data.data;
  },

  async getById(id: string): Promise<Item> {
    const res = await api.get(`/items/${id}`);
    return res.data.data;
  },

  async getMyItems(): Promise<Item[]> {
    const res = await api.get('/items/user/my-items');
    return res.data.data || res.data;
  },

  async create(data: CreateItemInput): Promise<Item> {
    const payload = {
      ...data,
      pricePerDay: data.pricePerDay || data.dailyRate || 0,
    };
    const res = await api.post('/items', payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },
};
