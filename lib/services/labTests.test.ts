import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestUser() {
  return prisma.user.create({
    data: { name: "Test User" },
  });
}

async function cleanUp() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
}

describe("labTestService.list", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns only active lab tests ordered by name ascending", async () => {
    const { list } = await import("./labTests");
    const user = await createTestUser();

    await prisma.labTest.createMany({
      data: [
        {
          code: "ZZZ",
          name: "Zebra Test",
          priceCents: 1000,
          turnaroundHours: 24,
          active: true,
          createdById: user.id,
        },
        {
          code: "AAA",
          name: "Alpha Test",
          priceCents: 2000,
          turnaroundHours: 12,
          active: true,
          createdById: user.id,
        },
        {
          code: "RET",
          name: "Retired Test",
          priceCents: 3000,
          turnaroundHours: 48,
          active: false,
          createdById: user.id,
        },
      ],
    });

    const tests = await list();

    expect(tests).toHaveLength(2);
    expect(tests[0].name).toBe("Alpha Test");
    expect(tests[1].name).toBe("Zebra Test");
  });

  it("returns all lab tests including inactive when includeInactive is true", async () => {
    const { list } = await import("./labTests");
    const user = await createTestUser();

    await prisma.labTest.createMany({
      data: [
        {
          code: "ACT",
          name: "Active Test",
          priceCents: 1000,
          turnaroundHours: 24,
          active: true,
          createdById: user.id,
        },
        {
          code: "RET",
          name: "Retired Test",
          priceCents: 2000,
          turnaroundHours: 12,
          active: false,
          createdById: user.id,
        },
      ],
    });

    const tests = await list(true);

    expect(tests).toHaveLength(2);
  });

  it("returns an empty array when no lab tests exist", async () => {
    const { list } = await import("./labTests");

    const tests = await list();

    expect(tests).toEqual([]);
  });
});

describe("labTestService.getById", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns the lab test when given a valid ID", async () => {
    const { getById } = await import("./labTests");
    const user = await createTestUser();

    const created = await prisma.labTest.create({
      data: {
        code: "CBC",
        name: "Complete Blood Count",
        priceCents: 3000,
        turnaroundHours: 24,
        createdById: user.id,
      },
    });

    const test = await getById(created.id);

    expect(test.id).toBe(created.id);
    expect(test.code).toBe("CBC");
    expect(test.name).toBe("Complete Blood Count");
  });

  it("returns inactive lab tests", async () => {
    const { getById } = await import("./labTests");
    const user = await createTestUser();

    const created = await prisma.labTest.create({
      data: {
        code: "OLD",
        name: "Old Retired Test",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: user.id,
      },
    });

    const test = await getById(created.id);

    expect(test.id).toBe(created.id);
    expect(test.active).toBe(false);
  });

  it("throws when given an ID that does not exist", async () => {
    const { getById } = await import("./labTests");

    await expect(getById("nonexistent-id")).rejects.toThrow();
  });
});

describe("labTestService.create", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("creates a lab test with valid data and returns the saved record", async () => {
    const { create } = await import("./labTests");
    const user = await createTestUser();

    const test = await create(
      {
        code: "CBC",
        name: "Complete Blood Count",
        priceCents: 3000,
        turnaroundHours: 24,
      },
      user.id
    );

    expect(test.code).toBe("CBC");
    expect(test.name).toBe("Complete Blood Count");
    expect(test.priceCents).toBe(3000);
    expect(test.turnaroundHours).toBe(24);
    expect(test.active).toBe(true);

    const fromDb = await prisma.labTest.findUnique({
      where: { id: test.id },
    });
    expect(fromDb).not.toBeNull();
    expect(fromDb!.code).toBe("CBC");
  });

  it("sets createdById to the calling user's ID", async () => {
    const { create } = await import("./labTests");
    const user = await createTestUser();

    const test = await create(
      {
        code: "TSH",
        name: "Thyroid Stimulating Hormone",
        priceCents: 4000,
        turnaroundHours: 36,
      },
      user.id
    );

    expect(test.createdById).toBe(user.id);
  });

  it("throws when code already exists", async () => {
    const { create } = await import("./labTests");
    const user = await createTestUser();

    await prisma.labTest.create({
      data: {
        code: "DUP",
        name: "Existing Test",
        priceCents: 1000,
        turnaroundHours: 12,
        createdById: user.id,
      },
    });

    await expect(
      create(
        {
          code: "DUP",
          name: "Duplicate Test",
          priceCents: 2000,
          turnaroundHours: 24,
        },
        user.id
      )
    ).rejects.toThrow();
  });
});

describe("labTestService.update", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("updates name, priceCents, and turnaroundHours and returns the updated record", async () => {
    const { update } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "CBC",
        name: "Old Name",
        priceCents: 1000,
        turnaroundHours: 12,
        createdById: user.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        name: "New Name",
        priceCents: 5000,
        turnaroundHours: 48,
      },
      user.id
    );

    expect(updated.name).toBe("New Name");
    expect(updated.priceCents).toBe(5000);
    expect(updated.turnaroundHours).toBe(48);
  });

  it("does not change the code field", async () => {
    const { update } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "ORIG",
        name: "Original",
        priceCents: 1000,
        turnaroundHours: 12,
        createdById: user.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        name: "Updated",
        priceCents: 2000,
        turnaroundHours: 24,
      },
      user.id
    );

    expect(updated.code).toBe("ORIG");
  });

  it("sets updatedById to the calling user's ID", async () => {
    const { update } = await import("./labTests");
    const creator = await createTestUser();
    const updater = await prisma.user.create({
      data: { name: "Updater" },
    });

    const existing = await prisma.labTest.create({
      data: {
        code: "CBC",
        name: "Test",
        priceCents: 1000,
        turnaroundHours: 12,
        createdById: creator.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        name: "Updated",
        priceCents: 2000,
        turnaroundHours: 24,
      },
      updater.id
    );

    expect(updated.updatedById).toBe(updater.id);
  });

  it("throws when lab test ID does not exist", async () => {
    const { update } = await import("./labTests");
    const user = await createTestUser();

    await expect(
      update(
        "nonexistent-id",
        {
          name: "Ghost",
          priceCents: 1000,
          turnaroundHours: 12,
        },
        user.id
      )
    ).rejects.toThrow();
  });

  it("allows updating a retired lab test", async () => {
    const { update } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "RET",
        name: "Retired Test",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: user.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        name: "Updated Retired Test",
        priceCents: 2000,
        turnaroundHours: 24,
      },
      user.id
    );

    expect(updated.name).toBe("Updated Retired Test");
    expect(updated.active).toBe(false);
  });
});

describe("labTestService.retire", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("sets active to false on an active lab test", async () => {
    const { retire } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "CBC",
        name: "Complete Blood Count",
        priceCents: 3000,
        turnaroundHours: 24,
        active: true,
        createdById: user.id,
      },
    });

    const retired = await retire(existing.id, user.id);

    expect(retired.active).toBe(false);
  });

  it("sets updatedById to the calling user's ID", async () => {
    const { retire } = await import("./labTests");
    const creator = await createTestUser();
    const updater = await prisma.user.create({
      data: { name: "Updater" },
    });

    const existing = await prisma.labTest.create({
      data: {
        code: "CBC",
        name: "Complete Blood Count",
        priceCents: 3000,
        turnaroundHours: 24,
        createdById: creator.id,
      },
    });

    const retired = await retire(existing.id, updater.id);

    expect(retired.updatedById).toBe(updater.id);
  });

  it("is idempotent — retiring an already-retired test does not throw", async () => {
    const { retire } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "OLD",
        name: "Already Retired",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: user.id,
      },
    });

    const result = await retire(existing.id, user.id);

    expect(result.active).toBe(false);
  });
});

describe("labTestService.reactivate", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("sets active to true on a retired lab test", async () => {
    const { reactivate } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "OLD",
        name: "Retired Test",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: user.id,
      },
    });

    const reactivated = await reactivate(existing.id, user.id);

    expect(reactivated.active).toBe(true);
  });

  it("sets updatedById to the calling user's ID", async () => {
    const { reactivate } = await import("./labTests");
    const creator = await createTestUser();
    const updater = await prisma.user.create({
      data: { name: "Updater" },
    });

    const existing = await prisma.labTest.create({
      data: {
        code: "OLD",
        name: "Retired Test",
        priceCents: 1000,
        turnaroundHours: 12,
        active: false,
        createdById: creator.id,
      },
    });

    const reactivated = await reactivate(existing.id, updater.id);

    expect(reactivated.updatedById).toBe(updater.id);
  });

  it("is idempotent — reactivating an already-active test does not throw", async () => {
    const { reactivate } = await import("./labTests");
    const user = await createTestUser();

    const existing = await prisma.labTest.create({
      data: {
        code: "ACT",
        name: "Already Active",
        priceCents: 1000,
        turnaroundHours: 12,
        active: true,
        createdById: user.id,
      },
    });

    const result = await reactivate(existing.id, user.id);

    expect(result.active).toBe(true);
  });
});
