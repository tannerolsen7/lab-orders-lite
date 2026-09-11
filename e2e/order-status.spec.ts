import { test, expect } from "@playwright/test";

test.describe("Order status transitions", () => {
  test("transitions an order from Pending through In Progress to Completed", async ({
    page,
  }) => {
    await page.goto("/orders/new");

    await page.getByRole("button", { name: "Select a patient..." }).click();
    await page.getByRole("button", { name: /James Chen/ }).click();
    await page.getByRole("button", { name: /Urinalysis/ }).click();
    await page.getByRole("button", { name: "Submit Order" }).click();

    await expect(
      page.getByRole("heading", { name: /Order #\d+/ })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pending")).toBeVisible();

    await page.getByRole("button", { name: "Start Processing" }).click();
    await expect(page.getByText("In Progress")).toBeVisible();

    await page.getByRole("button", { name: "Mark Completed" }).click();
    await expect(page.getByText("Completed")).toBeVisible();
    await expect(page.getByText("All tests processed.")).toBeVisible();
  });
});
