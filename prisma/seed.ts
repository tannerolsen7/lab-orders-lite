import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "user-dr-test" },
    update: {},
    create: {
      id: "user-dr-test",
      name: "Dr. Test",
    },
  });

  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: "patient-maria" },
      update: {},
      create: {
        id: "patient-maria",
        firstName: "Maria",
        lastName: "Garcia",
        dateOfBirth: new Date("1985-03-15"),
        phone: "(555) 234-5678",
        email: "maria.garcia@email.com",
        createdById: user.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: "patient-james" },
      update: {},
      create: {
        id: "patient-james",
        firstName: "James",
        lastName: "Chen",
        dateOfBirth: new Date("1992-11-02"),
        email: "james.chen@email.com",
        createdById: user.id,
      },
    }),
    prisma.patient.upsert({
      where: { id: "patient-sarah" },
      update: {},
      create: {
        id: "patient-sarah",
        firstName: "Sarah",
        lastName: "Thompson",
        dateOfBirth: new Date("1978-07-22"),
        phone: "(555) 876-5432",
        createdById: user.id,
      },
    }),
  ]);

  const labTests = await Promise.all([
    prisma.labTest.upsert({
      where: { code: "CBC" },
      update: {},
      create: {
        id: "test-cbc",
        code: "CBC",
        name: "Complete Blood Count",
        priceCents: 3000,
        turnaroundHours: 24,
        createdById: user.id,
      },
    }),
    prisma.labTest.upsert({
      where: { code: "LIPID" },
      update: {},
      create: {
        id: "test-lipid",
        code: "LIPID",
        name: "Lipid Panel",
        priceCents: 4500,
        turnaroundHours: 48,
        createdById: user.id,
      },
    }),
    prisma.labTest.upsert({
      where: { code: "VITD" },
      update: {},
      create: {
        id: "test-vitd",
        code: "VITD",
        name: "Vitamin D, 25-Hydroxy",
        priceCents: 5500,
        turnaroundHours: 72,
        createdById: user.id,
      },
    }),
    prisma.labTest.upsert({
      where: { code: "UA" },
      update: {},
      create: {
        id: "test-ua",
        code: "UA",
        name: "Urinalysis",
        priceCents: 2000,
        turnaroundHours: 12,
        createdById: user.id,
      },
    }),
    prisma.labTest.upsert({
      where: { code: "TSH" },
      update: {},
      create: {
        id: "test-tsh",
        code: "TSH",
        name: "Thyroid Stimulating Hormone",
        priceCents: 4000,
        turnaroundHours: 36,
        createdById: user.id,
      },
    }),
    prisma.labTest.upsert({
      where: { code: "HBA1C" },
      update: {},
      create: {
        id: "test-hba1c",
        code: "HBA1C",
        name: "Hemoglobin A1c",
        priceCents: 3500,
        turnaroundHours: 24,
        createdById: user.id,
      },
    }),
  ]);

  await prisma.order.upsert({
    where: { id: "order-completed" },
    update: {},
    create: {
      id: "order-completed",
      orderNumber: 1,
      patientId: patients[0].id,
      status: OrderStatus.COMPLETED,
      createdById: user.id,
      updatedById: user.id,
      createdAt: new Date("2026-09-01T10:00:00Z"),
      items: {
        create: [
          {
            labTestId: labTests[0].id,
            priceCentsSnapshot: labTests[0].priceCents,
            turnaroundHoursSnapshot: labTests[0].turnaroundHours,
          },
          {
            labTestId: labTests[1].id,
            priceCentsSnapshot: labTests[1].priceCents,
            turnaroundHoursSnapshot: labTests[1].turnaroundHours,
          },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: { id: "order-in-progress" },
    update: {},
    create: {
      id: "order-in-progress",
      orderNumber: 3,
      patientId: patients[1].id,
      status: OrderStatus.IN_PROGRESS,
      createdById: user.id,
      updatedById: user.id,
      createdAt: new Date("2026-09-08T14:30:00Z"),
      items: {
        create: [
          {
            labTestId: labTests[4].id,
            priceCentsSnapshot: labTests[4].priceCents,
            turnaroundHoursSnapshot: labTests[4].turnaroundHours,
          },
          {
            labTestId: labTests[5].id,
            priceCentsSnapshot: labTests[5].priceCents,
            turnaroundHoursSnapshot: labTests[5].turnaroundHours,
          },
          {
            labTestId: labTests[2].id,
            priceCentsSnapshot: labTests[2].priceCents,
            turnaroundHoursSnapshot: labTests[2].turnaroundHours,
          },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: { id: "order-cancelled" },
    update: {},
    create: {
      id: "order-cancelled",
      orderNumber: 2,
      patientId: patients[0].id,
      status: OrderStatus.CANCELLED,
      cancelReason: "Patient requested cancellation — duplicate order",
      createdById: user.id,
      updatedById: user.id,
      createdAt: new Date("2026-09-05T09:15:00Z"),
      items: {
        create: [
          {
            labTestId: labTests[3].id,
            priceCentsSnapshot: labTests[3].priceCents,
            turnaroundHoursSnapshot: labTests[3].turnaroundHours,
          },
        ],
      },
    },
  });

  console.log(`Seeded: ${patients.length} patients, ${labTests.length} lab tests, 3 orders`);
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
