import { prisma } from "@/lib/db";
import { isDateInPast } from "@/lib/domain/patient";
import type { PatientInput } from "@/lib/validations/patient";

export async function list() {
  return prisma.patient.findMany({
    orderBy: { lastName: "asc" },
  });
}

export async function getById(id: string) {
  return prisma.patient.findUniqueOrThrow({
    where: { id },
  });
}

export async function create(data: PatientInput, createdById: string) {
  if (!isDateInPast(data.dateOfBirth)) {
    throw new Error("Date of birth must be in the past");
  }

  return prisma.patient.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth + "T00:00:00"),
      phone: data.phone || null,
      email: data.email || null,
      createdById,
    },
  });
}

export async function update(
  id: string,
  data: PatientInput,
  updatedById: string
) {
  if (!isDateInPast(data.dateOfBirth)) {
    throw new Error("Date of birth must be in the past");
  }

  await prisma.patient.findUniqueOrThrow({ where: { id } });

  return prisma.patient.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth + "T00:00:00"),
      phone: data.phone || null,
      email: data.email || null,
      updatedById,
    },
  });
}
