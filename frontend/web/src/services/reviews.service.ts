/**
 * src/services/reviews.service.ts (web)
 * Reviews & ratings API client.
 */

import api from './api';

export interface ReviewAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Review {
  id: string;
  rentalId: string;
  itemId: string;
  authorId: string;
  targetUserId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthor;
  targetUser?: ReviewAuthor;
  item?: {
    id: string;
    title: string;
  };
}

export interface ReviewStatusResponse {
  canReview: boolean;
  hasReviewed: boolean;
  myReview: Review | null;
  otherReview: Review | null;
  targetUser: ReviewAuthor | null;
  rentalStatus: string;
}

export interface ReviewsListResponse {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewPayload {
  rentalId: string;
  rating: number;
  comment?: string | null;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string | null;
}

export interface ReviewsQuery {
  page?: number;
  limit?: number;
}

export const reviewsService = {
  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const res = await api.post('/api/reviews', payload);
    return res.data.data;
  },

  async updateReview(id: string, payload: UpdateReviewPayload): Promise<Review> {
    const res = await api.patch(`/api/reviews/${id}`, payload);
    return res.data.data;
  },

  async deleteReview(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/api/reviews/${id}`);
    return res.data.data;
  },

  async getRentalReviewStatus(rentalId: string): Promise<ReviewStatusResponse> {
    const res = await api.get(`/api/rentals/${rentalId}/review-status`);
    return res.data.data;
  },

  async getItemReviews(itemId: string, query: ReviewsQuery = {}): Promise<ReviewsListResponse> {
    const res = await api.get(`/api/items/${itemId}/reviews`, { params: query });
    return res.data.data;
  },

  async getUserReviews(userId: string, query: ReviewsQuery = {}): Promise<ReviewsListResponse> {
    const res = await api.get(`/api/users/${userId}/reviews`, { params: query });
    return res.data.data;
  },
};
