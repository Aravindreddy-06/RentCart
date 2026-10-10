/**
 * src/services/items.service.ts
 * Business logic for items — CRUD, search, filtering, and pagination.
 */

import prisma from '../prisma/client';

export interface ItemsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface CreateItemInput {
  ownerId: string;
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

// Owner fields included in item responses
const ownerSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  address: true,
} as const;

export async function getItems(query: ItemsQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 12));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // Full-text search on title and description
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Filter by category
  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: ownerSelect },
      },
    }),
    prisma.item.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getItemById(id: string) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      owner: { select: ownerSelect },
    },
  });
  return item;
}

export async function getMyItems(ownerId: string) {
  return prisma.item.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: ownerSelect },
    },
  });
}

export async function createItem(data: CreateItemInput) {
  return prisma.item.create({
    data: {
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      category: data.category,
      images: data.images,
      pricePerDay: data.pricePerDay,
      deposit: data.deposit ?? 0,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    include: {
      owner: { select: ownerSelect },
    },
  });
}

export async function updateItem(id: string, data: UpdateItemInput) {
  return prisma.item.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.images !== undefined && { images: data.images }),
      ...(data.pricePerDay !== undefined && { pricePerDay: data.pricePerDay }),
      ...(data.deposit !== undefined && { deposit: data.deposit }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
    },
    include: {
      owner: { select: ownerSelect },
    },
  });
}

export async function deleteItem(id: string) {
  return prisma.item.delete({ where: { id } });
}

export async function toggleAvailability(id: string, isAvailable: boolean) {
  return prisma.item.update({
    where: { id },
    data: { isAvailable },
    include: {
      owner: { select: ownerSelect },
    },
  });
}

export { getBookedDates } from './rentals.service';

