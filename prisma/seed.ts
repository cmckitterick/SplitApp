import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob",
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      name: "Charlie",
    },
  });

  const group = await prisma.group.create({
    data: {
      name: "Weekend Trip",
      createdBy: alice.id,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "OWNER" },
            { userId: bob.id, role: "MEMBER" },
            { userId: charlie.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      description: "Dinner at restaurant",
      totalAmount: 90.0,
      paidBy: alice.id,
      splits: {
        createMany: {
          data: [
            { userId: alice.id, amount: 30.0 },
            { userId: bob.id, amount: 30.0 },
            { userId: charlie.id, amount: 30.0 },
          ],
        },
      },
    },
  });

  console.log("Seed data created:", { alice, bob, charlie, group, expense });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
