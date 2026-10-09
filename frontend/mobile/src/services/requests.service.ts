/**
 * src/services/requests.service.ts (mobile)
 */

import api from './api';

export interface RequestItem {
  id: string;
  title: string;
  category: string;
  dailyRate: number;
  currency: string;
  images: string[];
}

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface BorrowRequest {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  item?: RequestItem;
  borrower?: RequestUser;
  lender?: RequestUser;
}

export interface CreateBorrowRequestPayload {
  itemId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export const requestsService = {
  create: async (data: CreateBorrowRequestPayload): Promise<BorrowRequest> => {
    const res = await api.post('/requests', data);
    return res.data;
  },

  getAll: async (role?: 'borrower' | 'lender'): Promise<BorrowRequest[]> => {
    const res = await api.get('/requests', { params: role ? { role } : {} });
    return res.data;
  },

  getById: async (id: string): Promise<BorrowRequest> => {
    const res = await api.get(`/requests/${id}`);
    return res.data;
  },

  updateStatus: async (
    id: string,
    status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
  ): Promise<BorrowRequest> => {
    const res = await api.patch(`/requests/${id}/status`, { status });
    return res.data;
  },
};
