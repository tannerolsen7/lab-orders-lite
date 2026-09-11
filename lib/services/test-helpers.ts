import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function createTestUser(name = "Test User") {
  return prisma.user.create({ data: { name } });
}

export async function cleanUp() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
}
