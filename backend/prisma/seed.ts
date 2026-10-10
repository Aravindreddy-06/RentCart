/**
 * RentCart — Database seed script
 * Run with: npx ts-node prisma/seed.ts (or via `npm run seed`)
 *
 * Creates sample users and items so the app has content to display on first run.
 * Coordinates are realistically clustered around Springfield with varying distances
 * (0 km, 0.8 km, 1.8 km, 4.2 km, 8.5 km) to thoroughly test the Nearby search radius filters.
 */

import { PrismaClient, RentalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database…');

  // ── Clear existing data ────────────────────────────────────────────────────
  await prisma.rental.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Alice Johnson — Center (Springfield Downtown)
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1-555-0101',
      passwordHash: hash('password123'),
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      address: '12 Maple Street, Springfield',
      latitude: 37.7749,
      longitude: -122.4194,
    },
  });

  // Bob Martinez — ~0.8 km from Alice
  const bob = await prisma.user.create({
    data: {
      name: 'Bob Martinez',
      email: 'bob@example.com',
      phone: '+1-555-0102',
      passwordHash: hash('password123'),
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      address: '45 Oak Avenue, Springfield',
      latitude: 37.7785,
      longitude: -122.4125,
    },
  });

  // Carol Smith — ~1.8 km from Alice
  const carol = await prisma.user.create({
    data: {
      name: 'Carol Smith',
      email: 'carol@example.com',
      phone: '+1-555-0103',
      passwordHash: hash('password123'),
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=80',
      address: '78 Pine Road, Springfield',
      latitude: 37.788,
      longitude: -122.408,
    },
  });

  // Dave Wilson — ~4.2 km from Alice
  const dave = await prisma.user.create({
    data: {
      name: 'Dave Wilson',
      email: 'dave@example.com',
      phone: '+1-555-0104',
      passwordHash: hash('password123'),
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      address: '105 Elm Boulevard, Springfield',
      latitude: 37.795,
      longitude: -122.392,
    },
  });

  // Emma Davis — ~8.5 km from Alice
  const emma = await prisma.user.create({
    data: {
      name: 'Emma Davis',
      email: 'emma@example.com',
      phone: '+1-555-0105',
      passwordHash: hash('password123'),
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      address: '220 Hillside Drive, Springfield',
      latitude: 37.82,
      longitude: -122.37,
    },
  });

  // ── Items ──────────────────────────────────────────────────────────────────
  await prisma.item.createMany({
    data: [
      // Alice's items (0.0 km from Alice)
      {
        ownerId: alice.id,
        title: 'DeWalt Power Drill',
        description: 'Cordless 20V drill, great condition. Comes with two batteries and a charger.',
        category: 'Tools',
        images: [
          'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 15,
        deposit: 50,
        isAvailable: true,
        latitude: 37.7749,
        longitude: -122.4194,
      },
      {
        ownerId: alice.id,
        title: 'Camping Tent (4-person)',
        description: 'Waterproof 4-person dome tent, easy setup. Pegs and poles included.',
        category: 'Sports',
        images: [
          'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 20,
        deposit: 80,
        isAvailable: true,
        latitude: 37.7749,
        longitude: -122.4194,
      },
      {
        ownerId: alice.id,
        title: 'Pressure Washer',
        description: '1800W electric pressure washer, ideal for driveways and decks.',
        category: 'Tools',
        images: [
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 30,
        deposit: 120,
        isAvailable: true,
        latitude: 37.7749,
        longitude: -122.4194,
      },

      // Bob's items (~0.8 km from Alice)
      {
        ownerId: bob.id,
        title: 'KitchenAid Stand Mixer',
        description: 'Professional 5-quart stand mixer in metallic silver. All attachments included.',
        category: 'Kitchen',
        images: [
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 25,
        deposit: 100,
        isAvailable: true,
        latitude: 37.7785,
        longitude: -122.4125,
      },
      {
        ownerId: bob.id,
        title: 'Sony A7 III Camera',
        description: 'Full-frame mirrorless camera with 28-70mm kit lens. Perfect for events.',
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 60,
        deposit: 300,
        isAvailable: false,
        latitude: 37.7785,
        longitude: -122.4125,
      },
      {
        ownerId: bob.id,
        title: 'Bluetooth Speaker (JBL Xtreme)',
        description: 'Waterproof portable speaker with 15-hour battery. Great for outdoors.',
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 10,
        deposit: 40,
        isAvailable: true,
        latitude: 37.7785,
        longitude: -122.4125,
      },

      // Carol's items (~1.8 km from Alice)
      {
        ownerId: carol.id,
        title: 'Mountain Bike',
        description: '21-speed Trek mountain bike, recently serviced. Helmet also available.',
        category: 'Sports',
        images: [
          'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 18,
        deposit: 60,
        isAvailable: true,
        latitude: 37.788,
        longitude: -122.408,
      },
      {
        ownerId: carol.id,
        title: 'Harry Potter Complete Series',
        description: 'All 7 Harry Potter books in hardcover, excellent condition.',
        category: 'Books',
        images: [
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 3,
        deposit: 20,
        isAvailable: true,
        latitude: 37.788,
        longitude: -122.408,
      },

      // Dave's items (~4.2 km from Alice)
      {
        ownerId: dave.id,
        title: 'Inflatable Kayak (2-person)',
        description: 'Rugged 2-person inflatable kayak with aluminum paddles and high-output pump.',
        category: 'Sports',
        images: [
          'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 28,
        deposit: 90,
        isAvailable: true,
        latitude: 37.795,
        longitude: -122.392,
      },
      {
        ownerId: dave.id,
        title: 'Cordless Lawn Mower',
        description: 'Battery-powered quiet lawn mower. Light and easy to push, includes bagger.',
        category: 'Tools',
        images: [
          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 22,
        deposit: 75,
        isAvailable: true,
        latitude: 37.795,
        longitude: -122.392,
      },

      // Emma's items (~8.5 km from Alice)
      {
        ownerId: emma.id,
        title: 'Telescopic Aluminum Ladder',
        description: 'Extends up to 12.5 ft. Collapses down to 3 ft for easy car boot transport.',
        category: 'Tools',
        images: [
          'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        ],
        pricePerDay: 16,
        deposit: 50,
        isAvailable: true,
        latitude: 37.82,
        longitude: -122.37,
      },
    ],
  });

  // ── Rentals ────────────────────────────────────────────────────────────────
  const allItems = await prisma.item.findMany();
  const drill = allItems.find((i) => i.title.includes('Drill'))!;
  const mixer = allItems.find((i) => i.title.includes('Mixer'))!;
  const bike = allItems.find((i) => i.title.includes('Bike'))!;
  const tent = allItems.find((i) => i.title.includes('Tent'))!;
  const camera = allItems.find((i) => i.title.includes('Camera'))!;
  const washer = allItems.find((i) => i.title.includes('Washer'))!;

  await prisma.rental.createMany({
    data: [
      {
        itemId: drill.id,
        borrowerId: bob.id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-03'),
        totalPrice: 45, // 3 days x 15
        depositAmount: 50,
        borrowerNote: 'Need this for putting up some shelves in my garage!',
        status: RentalStatus.PENDING,
      },
      {
        itemId: washer.id,
        borrowerId: carol.id,
        startDate: new Date('2026-11-05'),
        endDate: new Date('2026-11-07'),
        totalPrice: 90, // 3 days x 30
        depositAmount: 120,
        borrowerNote: 'Cleaning our driveway before the holidays.',
        status: RentalStatus.APPROVED,
      },
      {
        itemId: mixer.id,
        borrowerId: alice.id,
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-18'),
        totalPrice: 100, // 4 days x 25
        depositAmount: 100,
        borrowerNote: 'Baking a wedding cake this weekend!',
        status: RentalStatus.ACTIVE,
      },
      {
        itemId: bike.id,
        borrowerId: bob.id,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
        totalPrice: 54, // 3 days x 18
        depositAmount: 60,
        borrowerNote: 'Weekend trail ride in the park.',
        status: RentalStatus.RETURNED,
      },
      {
        itemId: camera.id,
        borrowerId: carol.id,
        startDate: new Date('2026-10-20'),
        endDate: new Date('2026-10-22'),
        totalPrice: 180, // 3 days x 60
        depositAmount: 300,
        borrowerNote: 'Taking portrait photos for family.',
        ownerNote: 'Camera is reserved for a private photo shoot that weekend.',
        status: RentalStatus.REJECTED,
      },
      {
        itemId: tent.id,
        borrowerId: bob.id,
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-12'),
        totalPrice: 60, // 3 days x 20
        depositAmount: 80,
        borrowerNote: 'Planning a quick weekend trip.',
        status: RentalStatus.CANCELLED,
      },
    ],
  });

  console.log('✅  Seed complete!');
  console.log(`   Users: alice@example.com, bob@example.com, carol@example.com, dave@example.com, emma@example.com`);
  console.log(`   Password for all: password123`);
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
