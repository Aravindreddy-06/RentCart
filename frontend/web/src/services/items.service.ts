/**
 * src/services/items.service.ts
 * Items API calls — supports all CRUD operations and image upload.
 */

import api from './api';

export interface ItemOwner {
  id: string;
  name: string;
  avatarUrl?: string;
  address?: string;
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
  distanceKm?: number;
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
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface CreateItemInput {
  title: string;
  description: string;
  category: string;
  images: string[];
  pricePerDay: number;
  deposit?: number;
  latitude?: number;
  longitude?: number;
}

export interface UpdateItemInput {
  title?: string;
  description?: string;
  category?: string;
  images?: string[];
  pricePerDay?: number;
  deposit?: number;
  latitude?: number;
  longitude?: number;
}

export const itemsService = {
  async getItems(query: ItemsQuery = {}): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.lat != null) params.set('lat', String(query.lat));
    if (query.lng != null) params.set('lng', String(query.lng));
    if (query.radiusKm != null) params.set('radiusKm', String(query.radiusKm));

    const res = await api.get(`/api/items?${params.toString()}`);
    return res.data.data;
  },

  async getById(id: string): Promise<Item> {
    const res = await api.get(`/api/items/${id}`);
    return res.data.data;
  },

  async getMyItems(): Promise<Item[]> {
    const res = await api.get('/api/items/mine');
    return res.data.data;
  },

  async create(data: CreateItemInput): Promise<Item> {
    const res = await api.post('/api/items', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const res = await api.patch(`/api/items/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/items/${id}`);
  },

  async toggleAvailability(id: string, isAvailable: boolean): Promise<Item> {
    const res = await api.patch(`/api/items/${id}/availability`, { isAvailable });
    return res.data.data;
  },

  /** Upload up to 5 images and return absolute URLs */
  async uploadImages(files: File[]): Promise<string[]> {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    const res = await api.post('/api/uploads/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.urls as string[];
  },
};
