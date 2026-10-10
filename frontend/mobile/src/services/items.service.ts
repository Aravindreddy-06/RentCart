/**
 * src/services/items.service.ts (mobile)
 * Items API calls matching backend JSON response structure.
 */

import api, { BASE_URL } from './api';

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
  pricePerDay: number;
  deposit?: number;
  images?: string[];
  latitude?: number;
  longitude?: number;
}

export interface UpdateItemInput {
  title?: string;
  description?: string;
  category?: string;
  pricePerDay?: number;
  deposit?: number;
  images?: string[];
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

    const url = `/items?${params.toString()}`;
    const res = await api.get(url);
    return res.data.data;
  },

  async getById(id: string): Promise<Item> {
    const res = await api.get(`/items/${id}`);
    return res.data.data;
  },

  async getMyItems(): Promise<Item[]> {
    const res = await api.get('/items/mine');
    return res.data.data;
  },

  async create(data: CreateItemInput): Promise<Item> {
    const res = await api.post('/items', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const res = await api.patch(`/items/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  async toggleAvailability(id: string, isAvailable: boolean): Promise<Item> {
    const res = await api.patch(`/items/${id}/availability`, { isAvailable });
    return res.data.data;
  },

  /**
   * Upload images as multipart/form-data.
   * Each uri is a local file URI from expo-image-picker.
   */
  async uploadImages(uris: string[]): Promise<string[]> {
    const formData = new FormData();
    uris.forEach((uri, index) => {
      const filename = uri.split('/').pop() ?? `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // React Native FormData accepts { uri, name, type }
      formData.append('images', { uri, name: filename, type } as unknown as Blob);
    });

    const res = await api.post('/uploads/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.urls as string[];
  },
};
