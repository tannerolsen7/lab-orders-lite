import { test, expect } from "@playwright/test";

test.describe("Patient management", () => {
  test("loads the patients page with heading", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
  });

  test("creates a new patient and shows them in the list", async ({ page }) => {
    await page.goto("/patients");

    await page.getByRole("button", { name: "New Patient" }).click();
    await expect(
      page.getByRole("heading", { name: "New Patient" })
    ).toBeVisible();

    const uniqueName = `PW${Date.now()}`;
    await page.getByLabel("First name").fill(uniqueName);
    await page.getByLabel("Last name").fill("Autotest");
    await page.getByLabel("Date of birth").fill("1990-01-15");
    await page.getByLabel("Phone").fill("(555) 999-0000");
    await page.getByLabel("Email").fill("pw-test@example.com");

    await page.getByRole("button", { name: "Add patient" }).click();

    await expect(
      page.getByText(`Autotest, ${uniqueName}`)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to patient detail page", async ({ page }) => {
    await page.goto("/patients");

    await page.getByText("Garcia, Maria").click();

    await expect(
      page.getByRole("heading", { name: "Garcia, Maria" })
    ).toBeVisible();
    await expect(page.getByText("Personal Information")).toBeVisible();
    await expect(page.getByText("Contact Information")).toBeVisible();
  });
});
