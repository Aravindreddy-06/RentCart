"use strict";
/**
 * RentCart — Database seed script
 * Run with: npx ts-node prisma/seed.ts (or via `npm run seed`)
 *
 * Creates sample users and items so the app has content to display on first run.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱  Seeding database…');
    // ── Clear existing data ────────────────────────────────────────────────────
    await prisma.rental.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    // ── Users ──────────────────────────────────────────────────────────────────
    const hash = (pw) => bcryptjs_1.default.hashSync(pw, 10);
    const alice = await prisma.user.create({
        data: {
            name: 'Alice Johnson',
            email: 'alice@example.com',
            phone: '+1-555-0101',
            passwordHash: hash('password123'),
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
            address: '12 Maple Street, Springfield',
            latitude: 37.7749,
            longitude: -122.4194,
        },
    });
    const bob = await prisma.user.create({
        data: {
            name: 'Bob Martinez',
            email: 'bob@example.com',
            phone: '+1-555-0102',
            passwordHash: hash('password123'),
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
            address: '45 Oak Avenue, Springfield',
            latitude: 37.7751,
            longitude: -122.4175,
        },
    });
    const carol = await prisma.user.create({
        data: {
            name: 'Carol Smith',
            email: 'carol@example.com',
            passwordHash: hash('password123'),
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
            address: '78 Pine Road, Springfield',
            latitude: 37.776,
            longitude: -122.421,
        },
    });
    // ── Items ──────────────────────────────────────────────────────────────────
    await prisma.item.createMany({
        data: [
            {
                ownerId: alice.id,
                title: 'DeWalt Power Drill',
                description: 'Cordless 20V drill, great condition. Comes with two batteries and a charger.',
                category: 'Tools',
                images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'],
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
                images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400'],
                pricePerDay: 20,
                deposit: 80,
                isAvailable: true,
                latitude: 37.7749,
                longitude: -122.4194,
            },
            {
                ownerId: bob.id,
                title: 'KitchenAid Stand Mixer',
                description: 'Professional 5-quart stand mixer in metallic silver. All attachments included.',
                category: 'Kitchen',
                images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
                pricePerDay: 25,
                deposit: 100,
                isAvailable: true,
                latitude: 37.7751,
                longitude: -122.4175,
            },
            {
                ownerId: bob.id,
                title: 'Sony A7 III Camera',
                description: 'Full-frame mirrorless camera with 28-70mm kit lens. Perfect for events.',
                category: 'Electronics',
                images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'],
                pricePerDay: 60,
                deposit: 300,
                isAvailable: false,
                latitude: 37.7751,
                longitude: -122.4175,
            },
            {
                ownerId: carol.id,
                title: 'Mountain Bike',
                description: '21-speed Trek mountain bike, recently serviced. Helmet also available.',
                category: 'Sports',
                images: ['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400'],
                pricePerDay: 18,
                deposit: 60,
                isAvailable: true,
                latitude: 37.776,
                longitude: -122.421,
            },
            {
                ownerId: carol.id,
                title: 'Harry Potter Complete Series',
                description: 'All 7 Harry Potter books in hardcover, excellent condition.',
                category: 'Books',
                images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
                pricePerDay: 3,
                deposit: 20,
                isAvailable: true,
                latitude: 37.776,
                longitude: -122.421,
            },
            {
                ownerId: alice.id,
                title: 'Pressure Washer',
                description: '1800W electric pressure washer, ideal for driveways and decks.',
                category: 'Tools',
                images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
                pricePerDay: 30,
                deposit: 120,
                isAvailable: true,
                latitude: 37.7749,
                longitude: -122.4194,
            },
            {
                ownerId: bob.id,
                title: 'Bluetooth Speaker (JBL Xtreme)',
                description: 'Waterproof portable speaker with 15-hour battery. Great for outdoors.',
                category: 'Electronics',
                images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'],
                pricePerDay: 10,
                deposit: 40,
                isAvailable: true,
                latitude: 37.7751,
                longitude: -122.4175,
            },
        ],
    });
    console.log('✅  Seed complete!');
    console.log(`   Users: alice@example.com, bob@example.com, carol@example.com`);
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
//# sourceMappingURL=seed.js.map