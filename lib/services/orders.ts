import { prisma } from "@/lib/db";
import { canTransition } from "@/lib/domain/order";
import type { OrderStatus } from "@prisma/client";

export async function create(data: {
  patientId: string;
  labTestIds: string[];
  createdById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) throw new Error("Patient not found");

    const labTests = await tx.labTest.findMany({
      where: { id: { in: data.labTestIds }, active: true },
    });
    if (labTests.length !== data.labTestIds.length) {
      throw new Error("One or more tests not found or inactive");
    }

    // Relies on SQLite's single-writer serialization; would need a sequence in Postgres
    const lastOrder = await tx.order.findFirst({
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    const order = await tx.order.create({
      data: {
        orderNumber: nextOrderNumber,
        patientId: data.patientId,
        createdById: data.createdById,
        items: {
          create: data.labTestIds.map((labTestId) => {
            const test = labTests.find((t) => t.id === labTestId)!;
            return {
              labTestId,
              priceCentsSnapshot: test.priceCents,
              turnaroundHoursSnapshot: test.turnaroundHours,
            };
          }),
        },
      },
      include: {
        items: { include: { labTest: true } },
        patient: true,
        createdBy: true,
      },
    });

    return order;
  });
}

export async function getById(id: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: {
        include: { labTest: true },
        orderBy: { createdAt: "asc" },
      },
      patient: true,
      createdBy: true,
      updatedBy: true,
    },
  });
}

export async function list(filters?: { status?: OrderStatus }) {
  return prisma.order.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: {
      patient: true,
      items: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listByPatient(patientId: string) {
  return prisma.order.findMany({
    where: { patientId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateStatus(
  id: string,
  status: OrderStatus,
  updatedById: string,
  cancelReason?: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
    });

    if (!canTransition(order.status, status)) {
      throw new Error(
        `Cannot transition from ${order.status} to ${status}`
      );
    }

    if (status === "CANCELLED" && !cancelReason) {
      throw new Error("Cancel reason is required when cancelling");
    }

    return tx.order.update({
      where: { id },
      data: {
        status,
        updatedById,
        cancelReason: status === "CANCELLED" ? cancelReason : null,
      },
    });
  });
}
