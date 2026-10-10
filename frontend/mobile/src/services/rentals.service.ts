/**
 * src/services/rentals.service.ts (mobile)
 * Rentals API calls for mobile.
 */

import api from './api';

export type RentalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'RETURNED'
  | 'CANCELLED';

export interface RentalUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface RentalItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  images: string[];
  pricePerDay: number;
  deposit: number;
  isAvailable: boolean;
  ownerId?: string;
  owner?: RentalUser;
}

export interface Rental {
  id: string;
  itemId: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  depositAmount: number;
  borrowerNote?: string | null;
  ownerNote?: string | null;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
  item: RentalItem;
  borrower: RentalUser;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RentalsResponse {
  rentals: Rental[];
  pagination: Pagination;
}

export interface CreateRentalPayload {
  itemId: string;
  startDate: string;
  endDate: string;
  borrowerNote?: string;
}

export interface BookedDateRange {
  startDate: string;
  endDate: string;
}

export const rentalsService = {
  async create(payload: CreateRentalPayload): Promise<Rental> {
    const res = await api.post('/rentals', payload);
    return res.data.data;
  },

  async getMyRentals(status?: string, page = 1, limit = 20): Promise<RentalsResponse> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params.status = status;
    const res = await api.get('/rentals/mine', { params });
    return res.data.data;
  },

  async getIncoming(status?: string, page = 1, limit = 20): Promise<RentalsResponse> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params.status = status;
    const res = await api.get('/rentals/incoming', { params });
    return res.data.data;
  },

  async getById(id: string): Promise<Rental> {
    const res = await api.get(`/rentals/${id}`);
    return res.data.data;
  },

  async approve(id: string): Promise<Rental> {
    const res = await api.patch(`/rentals/${id}/approve`);
    return res.data.data;
  },

  async reject(id: string, ownerNote?: string): Promise<Rental> {
    const res = await api.patch(`/rentals/${id}/reject`, { ownerNote });
    return res.data.data;
  },

  async cancel(id: string): Promise<Rental> {
    const res = await api.patch(`/rentals/${id}/cancel`);
    return res.data.data;
  },

  async activate(id: string): Promise<Rental> {
    const res = await api.patch(`/rentals/${id}/activate`);
    return res.data.data;
  },

  async return(id: string): Promise<Rental> {
    const res = await api.patch(`/rentals/${id}/return`);
    return res.data.data;
  },

  async getBookedDates(itemId: string): Promise<BookedDateRange[]> {
    const res = await api.get(`/items/${itemId}/booked-dates`);
    return res.data.data;
  },
};
