/**
 * src/services/items.service.ts
 * Business logic for fetching items with search, category filter, and pagination.
 */

import prisma from '../prisma/client';

export interface ItemsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

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
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
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
