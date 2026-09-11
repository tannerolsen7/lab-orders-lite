import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { create, getById, list, updateStatus } from "./orders";

const prisma = new PrismaClient();

async function createTestUser(name = "Test User") {
  return prisma.user.create({ data: { name } });
}

async function createTestPatient(createdById: string) {
  return prisma.patient.create({
    data: {
      firstName: "Sarah",
      lastName: "Thompson",
      dateOfBirth: new Date("1990-01-15"),
      createdById,
    },
  });
}

async function createTestLabTests(createdById: string, count = 3) {
  const tests = [
    { code: "CBC", name: "Complete Blood Count", priceCents: 4500, turnaroundHours: 24 },
    { code: "BMP", name: "Basic Metabolic Panel", priceCents: 5500, turnaroundHours: 24 },
    { code: "TSH", name: "Thyroid Stimulating Hormone", priceCents: 6500, turnaroundHours: 48 },
  ];
  const created = [];
  for (const test of tests.slice(0, count)) {
    created.push(await prisma.labTest.create({ data: { ...test, createdById } }));
  }
  return created;
}

async function cleanUp() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
}

describe("orderService.create", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("creates an order with snapshotted prices in a single transaction", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 2);

    const order = await create({
      patientId: patient.id,
      labTestIds: labTests.map((t) => t.id),
      createdById: user.id,
    });

    expect(order.patientId).toBe(patient.id);
    expect(order.status).toBe("PENDING");
    expect(order.createdById).toBe(user.id);
    expect(order.items).toHaveLength(2);
    expect(order.items[0].priceCentsSnapshot).toBe(4500);
    expect(order.items[0].turnaroundHoursSnapshot).toBe(24);
    expect(order.items[1].priceCentsSnapshot).toBe(5500);
    expect(order.items[1].turnaroundHoursSnapshot).toBe(24);
  });

  it("assigns an auto-incrementing orderNumber", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order1 = await create({
      patientId: patient.id,
      labTestIds: [labTests[0].id],
      createdById: user.id,
    });
    const order2 = await create({
      patientId: patient.id,
      labTestIds: [labTests[0].id],
      createdById: user.id,
    });

    expect(order2.orderNumber).toBe(order1.orderNumber + 1);
  });

  it("throws when patient does not exist", async () => {
    const user = await createTestUser();
    const labTests = await createTestLabTests(user.id, 1);

    await expect(
      create({
        patientId: "nonexistent-patient",
        labTestIds: [labTests[0].id],
        createdById: user.id,
      })
    ).rejects.toThrow("Patient not found");
  });

  it("throws when a lab test does not exist", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);

    await expect(
      create({
        patientId: patient.id,
        labTestIds: ["nonexistent-test"],
        createdById: user.id,
      })
    ).rejects.toThrow("One or more tests not found or inactive");
  });

  it("throws when lab test IDs contain duplicates", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    await expect(
      create({
        patientId: patient.id,
        labTestIds: [labTests[0].id, labTests[0].id],
        createdById: user.id,
      })
    ).rejects.toThrow("One or more tests not found or inactive");
  });

  it("throws when a lab test is inactive", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const inactiveTest = await prisma.labTest.create({
      data: {
        code: "INACTIVE",
        name: "Inactive Test",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: user.id,
      },
    });

    await expect(
      create({
        patientId: patient.id,
        labTestIds: [inactiveTest.id],
        createdById: user.id,
      })
    ).rejects.toThrow("One or more tests not found or inactive");
  });
});

describe("orderService.getById", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns the order with items, patient, and lab test details", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 2);

    const created = await create({
      patientId: patient.id,
      labTestIds: labTests.map((t) => t.id),
      createdById: user.id,
    });

    const order = await getById(created.id);

    expect(order.id).toBe(created.id);
    expect(order.patient.firstName).toBe("Sarah");
    expect(order.items).toHaveLength(2);
    expect(order.items[0].labTest.code).toBe("CBC");
    expect(order.createdBy.name).toBe("Test User");
  });

  it("throws when the order does not exist", async () => {

    await expect(getById("nonexistent-order")).rejects.toThrow();
  });
});

describe("orderService.list", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns all orders with patient info ordered by creation date descending", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });

    const orders = await list();

    expect(orders).toHaveLength(2);
    expect(orders[0].patient.firstName).toBe("Sarah");
    expect(orders[0].createdAt.getTime()).toBeGreaterThanOrEqual(orders[1].createdAt.getTime());
  });

  it("filters by status when provided", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order1 = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    await updateStatus(order1.id, "IN_PROGRESS", user.id);

    const pending = await list({ status: "PENDING" });
    const inProgress = await list({ status: "IN_PROGRESS" });

    expect(pending).toHaveLength(1);
    expect(inProgress).toHaveLength(1);
  });

  it("returns an empty array when no orders exist", async () => {

    const orders = await list();

    expect(orders).toEqual([]);
  });
});

describe("orderService.updateStatus", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("transitions from PENDING to IN_PROGRESS", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    const updated = await updateStatus(order.id, "IN_PROGRESS", user.id);

    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.updatedById).toBe(user.id);
  });

  it("transitions from IN_PROGRESS to COMPLETED", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    await updateStatus(order.id, "IN_PROGRESS", user.id);
    const completed = await updateStatus(order.id, "COMPLETED", user.id);

    expect(completed.status).toBe("COMPLETED");
  });

  it("sets cancelReason when transitioning to CANCELLED", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    const cancelled = await updateStatus(order.id, "CANCELLED", user.id, "Patient requested delay");

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("Patient requested delay");
  });

  it("cancels from IN_PROGRESS with reason", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });
    await updateStatus(order.id, "IN_PROGRESS", user.id);
    const cancelled = await updateStatus(order.id, "CANCELLED", user.id, "Lab equipment failure");

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("Lab equipment failure");
  });

  it("throws when transition is invalid", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });

    await expect(
      updateStatus(order.id, "COMPLETED", user.id)
    ).rejects.toThrow("Cannot transition");
  });

  it("throws when cancelling without a reason", async () => {
    const user = await createTestUser();
    const patient = await createTestPatient(user.id);
    const labTests = await createTestLabTests(user.id, 1);

    const order = await create({ patientId: patient.id, labTestIds: [labTests[0].id], createdById: user.id });

    await expect(
      updateStatus(order.id, "CANCELLED", user.id)
    ).rejects.toThrow("Cancel reason is required");
  });

  it("throws when order does not exist", async () => {
    const user = await createTestUser();

    await expect(
      updateStatus("nonexistent", "IN_PROGRESS", user.id)
    ).rejects.toThrow();
  });
});
