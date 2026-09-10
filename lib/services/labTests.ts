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
  return prisma.labTest.create({
    data: {
      code: data.code,
      name: data.name,
      priceCents: data.priceCents,
      turnaroundHours: data.turnaroundHours,
      createdById,
    },
  });
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
  return prisma.labTest.update({
    where: { id },
    data: {
      name: data.name,
      priceCents: data.priceCents,
      turnaroundHours: data.turnaroundHours,
      updatedById,
    },
  });
}

export async function retire(id: string, updatedById: string) {
  return prisma.labTest.update({
    where: { id },
    data: {
      active: false,
      updatedById,
    },
  });
}

export async function reactivate(id: string, updatedById: string) {
  return prisma.labTest.update({
    where: { id },
    data: {
      active: true,
      updatedById,
    },
  });
}
