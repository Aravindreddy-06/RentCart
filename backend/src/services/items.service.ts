/**
 * src/services/items.service.ts
 * Business logic for items — CRUD, search, filtering, nearby search (Haversine),
 * and privacy coordinate rounding.
 */

import prisma from '../prisma/client';
import { Prisma } from '@prisma/client';

export interface ItemsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  currentUserId?: string;
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

  // ── Nearby search using Haversine formula if lat & lng provided ───────────
  if (query.lat != null && query.lng != null && !isNaN(query.lat) && !isNaN(query.lng)) {
    const lat = query.lat;
    const lng = query.lng;
    const radiusKm = Math.min(50, Math.max(0.1, query.radiusKm ?? 5));

    // Bounding-box pre-filter to leverage (latitude, longitude) composite index
    const deltaLat = radiusKm / 111.045;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const deltaLng = radiusKm / (111.045 * Math.max(cosLat, 0.0001));

    const minLat = lat - deltaLat;
    const maxLat = lat + deltaLat;
    const minLng = lng - deltaLng;
    const maxLng = lng + deltaLng;

    // Haversine formula in km
    const distanceFormula = Prisma.sql`(6371 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(${lat})) * cos(radians(i."latitude")) *
        cos(radians(i."longitude") - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(i."latitude"))
      ))
    ))`;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`i."latitude" IS NOT NULL`,
      Prisma.sql`i."longitude" IS NOT NULL`,
      Prisma.sql`i."latitude" >= ${minLat}`,
      Prisma.sql`i."latitude" <= ${maxLat}`,
      Prisma.sql`i."longitude" >= ${minLng}`,
      Prisma.sql`i."longitude" <= ${maxLng}`,
      Prisma.sql`${distanceFormula} <= ${radiusKm}`,
    ];

    if (query.category) {
      conditions.push(Prisma.sql`LOWER(i."category") = LOWER(${query.category})`);
    }

    if (query.search) {
      const searchTerm = `%${query.search}%`;
      conditions.push(
        Prisma.sql`(i."title" ILIKE ${searchTerm} OR i."description" ILIKE ${searchTerm})`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // Total count query
    const countResult: Array<{ count: number | bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "items" i
      WHERE ${whereClause}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    // Items query with distanceKm, sorted nearest first
    const rawItems: any[] = await prisma.$queryRaw`
      SELECT 
        i."id",
        i."ownerId",
        i."title",
        i."description",
        i."category",
        i."images",
        i."pricePerDay",
        i."deposit",
        i."isAvailable",
        i."latitude",
        i."longitude",
        i."createdAt",
        i."updatedAt",
        u."id" AS "owner_id",
        u."name" AS "owner_name",
        u."avatarUrl" AS "owner_avatarUrl",
        u."address" AS "owner_address",
        ${distanceFormula} AS "distanceKm"
      FROM "items" i
      JOIN "users" u ON i."ownerId" = u."id"
      WHERE ${whereClause}
      ORDER BY "distanceKm" ASC, i."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const mappedItems = rawItems.map((r) => {
      const isOwner = query.currentUserId && r.ownerId === query.currentUserId;
      const rawDist = Number(r.distanceKm);
      const roundedDist = Math.round(rawDist * 10) / 10;

      return {
        id: r.id,
        ownerId: r.ownerId,
        title: r.title,
        description: r.description,
        category: r.category,
        images: r.images,
        pricePerDay: Number(r.pricePerDay),
        deposit: Number(r.deposit),
        isAvailable: Boolean(r.isAvailable),
        // Round coordinates to ~3 decimals for non-owners to protect home location
        latitude:
          r.latitude != null
            ? isOwner
              ? Number(r.latitude)
              : Math.round(Number(r.latitude) * 1000) / 1000
            : null,
        longitude:
          r.longitude != null
            ? isOwner
              ? Number(r.longitude)
              : Math.round(Number(r.longitude) * 1000) / 1000
            : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        distanceKm: roundedDist,
        owner: {
          id: r.owner_id,
          name: r.owner_name,
          avatarUrl: r.owner_avatarUrl,
          address: r.owner_address,
        },
      };
    });

    const itemsWithStats = await attachRatingStats(mappedItems);

    return {
      items: itemsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Standard search (lat/lng missing) ─────────────────────────────────────
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

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

  // Round coordinates to ~3 decimals for non-owners
  const mappedItems = items.map((item) => {
    const isOwner = query.currentUserId && item.ownerId === query.currentUserId;
    return {
      ...item,
      latitude:
        item.latitude != null
          ? isOwner
            ? item.latitude
            : Math.round(item.latitude * 1000) / 1000
          : null,
      longitude:
        item.longitude != null
          ? isOwner
            ? item.longitude
            : Math.round(item.longitude * 1000) / 1000
          : null,
    };
  });

  const itemsWithStats = await attachRatingStats(mappedItems);

  return {
    items: itemsWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function attachRatingStats<T extends { id: string }>(
  items: T[],
): Promise<Array<T & { averageRating: number; reviewCount: number }>> {
  if (items.length === 0) return [];
  const itemIds = items.map((i) => i.id);
  const reviewsAgg = await prisma.review.groupBy({
    by: ['itemId'],
    where: { itemId: { in: itemIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const ratingMap = new Map(
    reviewsAgg.map((r) => [
      r.itemId,
      {
        averageRating: r._avg.rating != null ? Math.round(r._avg.rating * 10) / 10 : 0,
        reviewCount: r._count._all,
      },
    ]),
  );

  return items.map((item) => ({
    ...item,
    averageRating: ratingMap.get(item.id)?.averageRating ?? 0,
    reviewCount: ratingMap.get(item.id)?.reviewCount ?? 0,
  }));
}

export async function getItemById(id: string, currentUserId?: string) {
  const [item, aggregate] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: {
        owner: { select: ownerSelect },
      },
    }),
    prisma.review.aggregate({
      where: { itemId: id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  if (!item) return null;

  const rawAvg = aggregate._avg.rating ?? 0;
  const averageRating = Math.round(rawAvg * 10) / 10;
  const reviewCount = aggregate._count._all;

  const isOwner = currentUserId && item.ownerId === currentUserId;
  return {
    ...item,
    averageRating,
    reviewCount,
    latitude:
      item.latitude != null
        ? isOwner
          ? item.latitude
          : Math.round(item.latitude * 1000) / 1000
        : null,
    longitude:
      item.longitude != null
        ? isOwner
          ? item.longitude
          : Math.round(item.longitude * 1000) / 1000
        : null,
  };
}

export async function getMyItems(ownerId: string) {
  const items = await prisma.item.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: ownerSelect },
    },
  });
  return attachRatingStats(items);
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
