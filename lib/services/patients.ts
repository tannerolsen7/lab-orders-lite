import type { Patient as PrismaPatient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isDateInPast, toUTCDate } from "@/lib/domain/dates";
import { formatPhone } from "@/lib/domain/patient";
import type { PatientInput } from "@/lib/validations/patient";

export type PatientSummary = Pick<
  PrismaPatient,
  "id" | "firstName" | "lastName" | "dateOfBirth" | "phone" | "email"
>;

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

function toPatientData(data: PatientInput) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: toUTCDate(data.dateOfBirth),
    phone: data.phone ? formatPhone(data.phone) : null,
    email: data.email || null,
  };
}

function validateDob(dateOfBirth: string) {
  if (!isDateInPast(dateOfBirth)) {
    throw new Error("Date of birth must be in the past");
  }
}

export async function create(data: PatientInput, createdById: string) {
  validateDob(data.dateOfBirth);

  return prisma.patient.create({
    data: { ...toPatientData(data), createdById },
  });
}

export async function update(
  id: string,
  data: PatientInput,
  updatedById: string
) {
  validateDob(data.dateOfBirth);

  return prisma.patient.update({
    where: { id },
    data: { ...toPatientData(data), updatedById },
  });
}
