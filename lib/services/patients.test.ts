import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { list, getById, create, update } from "./patients";

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

describe("patientService.list", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns all patients ordered by last name ascending", async () => {
    const user = await createTestUser();

    await prisma.patient.createMany({
      data: [
        {
          firstName: "Zara",
          lastName: "Williams",
          dateOfBirth: new Date("1990-01-01"),
          email: "zara@test.com",
          createdById: user.id,
        },
        {
          firstName: "Alice",
          lastName: "Adams",
          dateOfBirth: new Date("1985-06-15"),
          phone: "555-0001",
          createdById: user.id,
        },
        {
          firstName: "Maria",
          lastName: "Lopez",
          dateOfBirth: new Date("1978-03-20"),
          email: "maria@test.com",
          createdById: user.id,
        },
      ],
    });

    const patients = await list();

    expect(patients).toHaveLength(3);
    expect(patients[0].lastName).toBe("Adams");
    expect(patients[1].lastName).toBe("Lopez");
    expect(patients[2].lastName).toBe("Williams");
  });

  it("returns an empty array when no patients exist", async () => {

    const patients = await list();

    expect(patients).toEqual([]);
  });
});

describe("patientService.getById", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("returns the patient when given a valid ID", async () => {
    const user = await createTestUser();

    const created = await prisma.patient.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: new Date("1990-05-10"),
        email: "jane@test.com",
        createdById: user.id,
      },
    });

    const patient = await getById(created.id);

    expect(patient.id).toBe(created.id);
    expect(patient.firstName).toBe("Jane");
    expect(patient.lastName).toBe("Doe");
  });

  it("throws when given an ID that does not exist", async () => {

    await expect(getById("nonexistent-id")).rejects.toThrow();
  });
});

describe("patientService.create", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("creates a patient with valid data and returns the saved record", async () => {
    const user = await createTestUser();

    const patient = await create(
      {
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: "2000-01-15",
        phone: "555-1234",
        email: "john@test.com",
      },
      user.id
    );

    expect(patient.firstName).toBe("John");
    expect(patient.lastName).toBe("Smith");
    expect(patient.phone).toBe("555-1234");
    expect(patient.email).toBe("john@test.com");
    expect(patient.createdById).toBe(user.id);

    const fromDb = await prisma.patient.findUnique({
      where: { id: patient.id },
    });
    expect(fromDb).not.toBeNull();
    expect(fromDb!.firstName).toBe("John");
  });

  it("stores null when phone or email is an empty string", async () => {
    const user = await createTestUser();

    const patient = await create(
      {
        firstName: "No",
        lastName: "Contact",
        dateOfBirth: "1990-01-01",
        phone: "555-0000",
        email: "",
      },
      user.id
    );

    expect(patient.email).toBeNull();
    expect(patient.phone).toBe("555-0000");
  });

  it("throws when date of birth is in the future", async () => {
    const user = await createTestUser();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await expect(
      create(
        {
          firstName: "Future",
          lastName: "Baby",
          dateOfBirth: futureDateStr,
          email: "future@test.com",
        },
        user.id
      )
    ).rejects.toThrow("Date of birth must be in the past");
  });
});

describe("patientService.update", () => {
  beforeEach(cleanUp);
  afterEach(cleanUp);

  it("updates patient fields and returns the updated record", async () => {
    const user = await createTestUser();

    const existing = await prisma.patient.create({
      data: {
        firstName: "Old",
        lastName: "Name",
        dateOfBirth: new Date("1990-01-01"),
        email: "old@test.com",
        createdById: user.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        firstName: "New",
        lastName: "Name",
        dateOfBirth: "1985-06-15",
        email: "new@test.com",
      },
      user.id
    );

    expect(updated.firstName).toBe("New");
    expect(updated.email).toBe("new@test.com");
    expect(updated.dateOfBirth.toISOString()).toContain("1985-06-15");
  });

  it("sets updatedById to the calling user's ID", async () => {
    const creator = await createTestUser();
    const updater = await prisma.user.create({
      data: { name: "Updater" },
    });

    const existing = await prisma.patient.create({
      data: {
        firstName: "Test",
        lastName: "Patient",
        dateOfBirth: new Date("1990-01-01"),
        phone: "555-0000",
        createdById: creator.id,
      },
    });

    const updated = await update(
      existing.id,
      {
        firstName: "Test",
        lastName: "Patient",
        dateOfBirth: "1990-01-01",
        phone: "555-0000",
      },
      updater.id
    );

    expect(updated.updatedById).toBe(updater.id);
  });

  it("throws when date of birth is in the future", async () => {
    const user = await createTestUser();

    const existing = await prisma.patient.create({
      data: {
        firstName: "Test",
        lastName: "Patient",
        dateOfBirth: new Date("1990-01-01"),
        email: "test@test.com",
        createdById: user.id,
      },
    });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await expect(
      update(
        existing.id,
        {
          firstName: "Test",
          lastName: "Patient",
          dateOfBirth: futureDateStr,
          email: "test@test.com",
        },
        user.id
      )
    ).rejects.toThrow("Date of birth must be in the past");
  });

  it("throws when patient ID does not exist", async () => {
    const user = await createTestUser();

    await expect(
      update(
        "nonexistent-id",
        {
          firstName: "Ghost",
          lastName: "Patient",
          dateOfBirth: "1990-01-01",
          email: "ghost@test.com",
        },
        user.id
      )
    ).rejects.toThrow();
  });
});
