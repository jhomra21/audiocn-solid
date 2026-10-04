import { expect, test } from "@playwright/test";

test("shared Kobalte source supports pointer and keyboard behavior", async ({ page }) => {
  const failures: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      failures.push(`${message.type()}: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  await page.goto("/");

  const slider = page.getByTestId("slider-thumb");

  await expect(slider).toHaveAttribute("role", "slider");
  await expect(slider).toHaveAttribute("aria-valuenow", "25");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "30");

  const track = page.getByTestId("slider-track");
  const box = await track.boundingBox();

  if (!box) {
    throw new Error("Slider track has no layout box.");
  }

  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
  await expect
    .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
    .toBeGreaterThan(30);

  const selectTrigger = page.getByTestId("select-trigger");
  await selectTrigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "Two" }).click();
  await expect(selectTrigger).toContainText("Two");

  const popoverTrigger = page.getByTestId("popover-trigger");
  await popoverTrigger.click();
  await expect(page.getByTestId("popover-content")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("popover-content")).toBeHidden();

  const switchInput = page.getByRole("switch", { name: "Test switch" });
  await expect(switchInput).not.toBeChecked();
  await page.getByTestId("switch-control").click();
  await expect(switchInput).toBeChecked();
  await switchInput.focus();
  await switchInput.press("Space");
  await expect(switchInput).not.toBeChecked();

  const tabs = page.getByRole("tab");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await tabs.nth(0).press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Body two");

  const tooltipTrigger = page.getByTestId("tooltip-trigger");
  await tooltipTrigger.focus();
  await expect(page.getByTestId("tooltip-content")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("tooltip-content")).toBeHidden();

  const contextTrigger = page.getByTestId("context-trigger");
  await contextTrigger.click({ button: "right" });
  await expect(page.getByTestId("context-content")).toBeVisible();
  await page.getByRole("menuitem", { name: "Menu action" }).click();
  await expect(page.getByTestId("context-content")).toBeHidden();

  expect(failures).toEqual([]);
});
