import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function list(includeInactive?: boolean) {
  return prisma.labTest.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
  });
}

export async function getById(id: string) {
  return prisma.labTest.findUniqueOrThrow({
    where: { id },
  });
}

interface CreateInput {
  code: string;
  name: string;
  priceCents: number;
  turnaroundHours: number;
}

export async function create(data: CreateInput, createdById: string) {
  try {
    return await prisma.labTest.create({
      data: {
        code: data.code,
        name: data.name,
        priceCents: data.priceCents,
        turnaroundHours: data.turnaroundHours,
        createdById,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("A lab test with this code already exists.");
    }
    throw e;
  }
}

interface UpdateInput {
  name: string;
  priceCents: number;
  turnaroundHours: number;
}

export async function update(
  id: string,
  data: UpdateInput,
  updatedById: string
) {
  try {
    return await prisma.labTest.update({
      where: { id },
      data: {
        name: data.name,
        priceCents: data.priceCents,
        turnaroundHours: data.turnaroundHours,
        updatedById,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new Error("Lab test not found");
    }
    throw e;
  }
}

export async function retire(id: string, updatedById: string) {
  try {
    return await prisma.labTest.update({
      where: { id },
      data: {
        active: false,
        updatedById,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new Error("Lab test not found");
    }
    throw e;
  }
}

export async function reactivate(id: string, updatedById: string) {
  try {
    return await prisma.labTest.update({
      where: { id },
      data: {
        active: true,
        updatedById,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new Error("Lab test not found");
    }
    throw e;
  }
}
