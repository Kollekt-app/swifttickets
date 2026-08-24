/**
 * Seeds a working demo: one admin, one organizer, one customer, a few
 * published events and a live competition.
 *
 * Safe to re-run — everything is upserted by a stable key.
 */
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const password = (value: string) => bcrypt.hash(value, 10);

const daysFromNow = (days: number, hour = 20): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

/**
 * Deterministic placeholder photos. Picsum always resolves for a given seed,
 * so the demo never shows a broken image; organizers replace these with their
 * own artwork when they publish a real event.
 */
const photo = (seed: string, width = 1200, height = 800): string =>
  `https://picsum.photos/seed/${seed}/${width}/${height}`;

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@swifttickets.lr' },
    update: { role: 'Admin' },
    create: {
      name: 'Swift Administrator',
      email: 'admin@swifttickets.lr',
      phone: '+231880000000',
      role: 'Admin',
      passwordHash: await password(adminPassword),
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@swifttickets.lr' },
    update: { role: 'Organizer' },
    create: {
      name: 'Monrovia Live Events',
      email: 'organizer@swifttickets.lr',
      phone: '+231770000001',
      role: 'Organizer',
      plan: 'Pro',
      passwordHash: await password(demoPassword),
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@swifttickets.lr' },
    update: {},
    create: {
      name: 'Aminata Kollie',
      email: 'customer@swifttickets.lr',
      phone: '+231880000002',
      role: 'Customer',
      passwordHash: await password(demoPassword),
    },
  });

  const events = [
    {
      key: 'seed-afrobeats-night',
      title: 'Afrobeats Night Monrovia',
      description:
        'Liberia\'s biggest Afrobeats showcase returns to the waterfront with live sets from across West Africa, food stalls and an open-air dance floor.',
      date: daysFromNow(14, 21),
      location: 'Waterside Arena, Monrovia',
      category: 'Music',
      imageUrl: photo('swift-afrobeats'),
      priorityLevel: 3,
      ticketTypes: [
        { name: 'Regular', price: 15, capacity: 800 },
        { name: 'VIP', price: 45, capacity: 200 },
        { name: 'VVIP Table Access', price: 120, capacity: 40 },
      ],
      tables: [
        { number: 1, price: 350, capacity: 8 },
        { number: 2, price: 350, capacity: 8 },
        { number: 3, price: 500, capacity: 12 },
      ],
    },
    {
      key: 'seed-robertsport',
      title: 'Robertsport Beach Festival',
      description:
        'Three days of surfing, bonfires and live highlife on the best break in West Africa. Camping passes included with weekend tickets.',
      date: daysFromNow(30, 10),
      endDate: daysFromNow(32, 22),
      location: 'Robertsport, Grand Cape Mount',
      category: 'Beach',
      imageUrl: photo('swift-robertsport'),
      priorityLevel: 2,
      ticketTypes: [
        { name: 'Day Pass', price: 10, capacity: 1000 },
        { name: 'Weekend Pass', price: 25, capacity: 500 },
      ],
      tables: [],
    },
    {
      key: 'seed-tech-summit',
      title: 'Liberia Tech & Startup Summit',
      description:
        'Founders, investors and public-sector leaders meet for two days of workshops on payments, logistics and digital identity across the Mano River Union.',
      date: daysFromNow(45, 9),
      endDate: daysFromNow(46, 17),
      location: 'Monrovia City Hall',
      category: 'Conference',
      imageUrl: photo('swift-techsummit'),
      priorityLevel: 1,
      ticketTypes: [
        { name: 'General Admission', price: 20, capacity: 400 },
        { name: 'Founder Pass', price: 75, capacity: 100 },
      ],
      tables: [],
    },
    {
      key: 'seed-sunday-brunch',
      title: 'Sunday Rooftop Brunch',
      description:
        'Bottomless brunch with a live DJ overlooking the Atlantic. Table reservations recommended — they sell out most weeks.',
      date: daysFromNow(7, 12),
      location: 'Sinkor Rooftop, Monrovia',
      category: 'Restaurant',
      imageUrl: photo('swift-brunch'),
      priorityLevel: 0,
      ticketTypes: [{ name: 'Brunch Entry', price: 30, capacity: 150 }],
      tables: [
        { number: 1, price: 180, capacity: 6 },
        { number: 2, price: 180, capacity: 6 },
        { number: 3, price: 240, capacity: 10 },
        { number: 4, price: 240, capacity: 10 },
      ],
    },
  ];

  for (const definition of events) {
    const existing = await prisma.event.findFirst({
      where: { title: definition.title, organizerId: organizer.id },
    });

    if (existing) continue;

    await prisma.event.create({
      data: {
        title: definition.title,
        description: definition.description,
        date: definition.date,
        endDate: definition.endDate ?? null,
        location: definition.location,
        organizerId: organizer.id,
        imageUrl: definition.imageUrl,
        category: definition.category,
        status: 'Published',
        priorityLevel: definition.priorityLevel,
        viewCount: Math.floor(Math.random() * 4000) + 200,
        insuranceEnabled: true,
        ticketTypes: {
          create: definition.ticketTypes.map((type, index) => ({
            ...type,
            sold: 0,
            position: index,
          })),
        },
        ...(definition.tables.length
          ? { tableOptions: { create: definition.tables } }
          : {}),
      },
    });
  }

  const existingCompetition = await prisma.competition.findFirst({
    where: { title: 'Face of Liberia 2026' },
  });

  if (!existingCompetition) {
    const votePrice = 0.5;

    await prisma.competition.create({
      data: {
        title: 'Face of Liberia 2026',
        description:
          'The national pageant returns. Vote for your favourite contestant — every vote is counted live and the top three advance to the televised final.',
        imageUrl: photo('swift-pageant'),
        organizerId: organizer.id,
        associatedEvent: 'Afrobeats Night Monrovia',
        category: 'Pageants',
        location: 'Monrovia, Liberia',
        votePrice,
        votePackages: [
          { votes: 1, price: votePrice },
          { votes: 10, price: Number((votePrice * 10).toFixed(2)) },
          { votes: 25, price: Number((votePrice * 25).toFixed(2)), discountLabel: 'Best Value' },
          { votes: 50, price: Number((votePrice * 50).toFixed(2)), discountLabel: 'VIP Supporter' },
          { votes: 100, price: Number((votePrice * 100).toFixed(2)), discountLabel: 'Mega Package' },
        ],
        commissionRate: 0.1,
        showLiveLeaderboard: true,
        startDate: daysFromNow(-3, 0),
        endDate: daysFromNow(21, 23),
        status: 'Active',
        candidates: {
          create: [
            {
              contestantNumber: '#01',
              name: 'Musu Cooper',
              description: 'Grand Bassa County — advocate for coastal clean-ups.',
              imageUrl: photo('swift-contestant-1', 600, 600),
              position: 0,
            },
            {
              contestantNumber: '#02',
              name: 'Fatu Sirleaf',
              description: 'Nimba County — nursing student and radio host.',
              imageUrl: photo('swift-contestant-2', 600, 600),
              position: 1,
            },
            {
              contestantNumber: '#03',
              name: 'Korto Nagbe',
              description: 'Montserrado County — runs a tailoring co-operative.',
              imageUrl: photo('swift-contestant-3', 600, 600),
              position: 2,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  Admin:     admin@swifttickets.lr / ${adminPassword}`);
  console.log(`  Organizer: organizer@swifttickets.lr / ${demoPassword}`);
  console.log(`  Customer:  customer@swifttickets.lr / ${demoPassword}`);
  console.log(`  Admin id:  ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
