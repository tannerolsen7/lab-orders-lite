import { test, expect } from "@playwright/test";

test.describe("Order creation", () => {
  test("loads the orders page", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("creates a new order and redirects to detail page", async ({ page }) => {
    await page.goto("/orders/new");

    await expect(page.getByText("New Order")).toBeVisible();

    await page.getByRole("button", { name: "Select a patient..." }).click();
    await page.getByRole("button", { name: /Maria Garcia/ }).click();

    await expect(page.getByText("Select Tests")).toBeVisible();

    await page.getByRole("button", { name: /CBC/ }).click();

    const summary = page.getByText("Order Summary").locator("..");
    await expect(summary.getByText("1 selected")).toBeVisible();

    await page.getByRole("button", { name: "Submit Order" }).click();

    await expect(
      page.getByRole("heading", { name: /Order #\d+/ })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pending")).toBeVisible();
  });
});
