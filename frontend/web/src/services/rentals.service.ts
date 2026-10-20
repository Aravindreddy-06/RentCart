/**
 * src/services/rentals.service.ts (web)
 * Rentals API client.
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
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupAddress?: string | null;
  pickupNote?: string | null;
  pickupTimeFrom?: string | null;
  pickupTimeTo?: string | null;
  createdAt: string;
  updatedAt: string;
  item: RentalItem;
  borrower: RentalUser;
}

export interface PickupPoint {
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupAddress: string | null;
  pickupNote: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
}

export interface ApproveRentalPayload {
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupAddress?: string | null;
  pickupNote?: string | null;
  pickupTimeFrom?: string | null;
  pickupTimeTo?: string | null;
}

export interface UpdatePickupPayload {
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupNote?: string | null;
  pickupTimeFrom?: string | null;
  pickupTimeTo?: string | null;
}

export interface LiveTrackingData {
  isSharing: boolean;
  location: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
  startedAt: string | null;
  updatedAt: string | null;
  etaMinutes: number | null;
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

export interface RentalsQuery {
  status?: RentalStatus | '';
  page?: number;
  limit?: number;
}

export interface BookedDateRange {
  startDate: string;
  endDate: string;
}

export const rentalsService = {
  async create(payload: CreateRentalPayload): Promise<Rental> {
    const res = await api.post('/api/rentals', payload);
    return res.data.data;
  },

  async getMyRentals(query: RentalsQuery = {}): Promise<RentalsResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const res = await api.get(`/api/rentals/mine?${params.toString()}`);
    return res.data.data;
  },

  async getIncoming(query: RentalsQuery = {}): Promise<RentalsResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const res = await api.get(`/api/rentals/incoming?${params.toString()}`);
    return res.data.data;
  },

  async getById(id: string): Promise<Rental> {
    const res = await api.get(`/api/rentals/${id}`);
    return res.data.data;
  },

  async approve(id: string, payload?: ApproveRentalPayload): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/approve`, payload || {});
    return res.data.data;
  },

  async updatePickup(id: string, payload: UpdatePickupPayload): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/pickup`, payload);
    return res.data.data;
  },

  async getPickup(id: string): Promise<PickupPoint> {
    const res = await api.get(`/api/rentals/${id}/pickup`);
    return res.data.data;
  },

  async startTracking(
    id: string,
    coords?: { latitude?: number; longitude?: number; heading?: number | null },
  ): Promise<LiveTrackingData> {
    const res = await api.post(`/api/rentals/${id}/tracking/start`, coords || {});
    return res.data.data;
  },

  async stopTracking(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/api/rentals/${id}/tracking/stop`);
    return res.data.data;
  },

  async markArrived(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/api/rentals/${id}/tracking/arrived`);
    return res.data.data;
  },

  async getTracking(id: string): Promise<LiveTrackingData> {
    const res = await api.get(`/api/rentals/${id}/tracking`);
    return res.data.data;
  },

  async reject(id: string, ownerNote?: string): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/reject`, { ownerNote });
    return res.data.data;
  },

  async cancel(id: string): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/cancel`);
    return res.data.data;
  },

  async getHandoverPin(id: string): Promise<{ pin: string; createdAt: string }> {
    const res = await api.get(`/api/rentals/${id}/handover-pin`);
    return res.data.data;
  },

  async verifyHandover(id: string, pin: string): Promise<Rental> {
    const res = await api.post(`/api/rentals/${id}/handover/verify`, { pin });
    return res.data.data;
  },

  async activate(id: string, payload: { confirmWithoutPin?: boolean } = { confirmWithoutPin: true }): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/activate`, payload);
    return res.data.data;
  },

  async return(id: string): Promise<Rental> {
    const res = await api.patch(`/api/rentals/${id}/return`);
    return res.data.data;
  },

  async getBookedDates(itemId: string): Promise<BookedDateRange[]> {
    const res = await api.get(`/api/items/${itemId}/booked-dates`);
    return res.data.data;
  },
};
