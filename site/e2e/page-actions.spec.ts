import { expect, test } from "@playwright/test";

const PAGE = "/docs/components/bar-visualizer";

const MARKDOWN_URL = `${PAGE}.md`;

const SOURCE_URL = "/r/solid2/bar-visualizer.json";

const MARKDOWN = "# Add Bar Visualizer from audiocn to this project\n";

const SOURCE = "export const BarVisualizer = () => null;";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("copies the page's Markdown, having fetched it only once", async ({
  page,
}) => {
  let fetched = 0;
  await page.route(`**${MARKDOWN_URL}`, async (route) => {
    fetched += 1;
    await route.fulfill({ body: MARKDOWN, contentType: "text/markdown" });
  });
  await page.goto(PAGE);

  const button = page.getByRole("button", {
    name: "Copy prompt for AI",
    exact: true,
  });

  await button.hover();
  await button.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(MARKDOWN);
  expect(fetched).toBe(1);
});

for (const [manager, prefix] of [
  ["pnpm", "pnpm dlx"],
  ["npm", "npx"],
  ["yarn", "yarn dlx"],
  ["bun", "bunx --bun"],
  ["prompt", "npx"],
] as const) {
  test(`copies the install command for the reader's package manager: ${manager}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("packageManager", JSON.stringify(value)),
      manager
    );
    await page.goto(PAGE);
    await page
      .getByRole("button", { name: "More actions for AI agents" })
      .click();
    await page.getByRole("menuitem", { name: "Copy install command" }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${prefix} shadcn@latest add @audiocn-solid/bar-visualizer`);
  });
}

test("copies the component source from this deployment's registry item", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.route(`**${SOURCE_URL}`, (route) =>
    route.fulfill({
      body: JSON.stringify({ files: [{ content: SOURCE }] }),
      contentType: "application/json",
    })
  );
  await page.goto(PAGE);
  await page
    .getByRole("button", { name: "More actions for AI agents" })
    .click();
  await page.getByRole("menuitem", { name: "Copy component source" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(SOURCE);
  expect(requested).toContain(`${new URL(page.url()).origin}${SOURCE_URL}`);
  expect(
    requested.some((url) =>
      url.startsWith("https://audiocn-solid.workers.dev/r/")
    )
  ).toBe(false);
});

test("hands the chat tools a compact prompt, and v0 the registry item", async ({
  page,
}) => {
  await page.goto(PAGE);
  await page
    .getByRole("button", { name: "More actions for AI agents" })
    .click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "View as Markdown" })
  ).toHaveAttribute("href", MARKDOWN_URL);

  const chat = new URL(
    (await menu
      .getByRole("menuitem", { name: "Open in ChatGPT" })
      .getAttribute("href"))!
  );

  const claude = new URL(
    (await menu
      .getByRole("menuitem", { name: "Open in Claude" })
      .getAttribute("href"))!
  );

  const v0 = new URL(
    (await menu
      .getByRole("menuitem", { name: "Open in v0" })
      .getAttribute("href"))!
  );

  expect(chat.origin).toBe("https://chatgpt.com");
  expect(chat.searchParams.get("hints")).toBe("search");
  expect(chat.searchParams.get("prompt")).toContain(
    `https://audiocn-solid.workers.dev${MARKDOWN_URL}`
  );
  expect(claude.searchParams.get("q")).toBe(chat.searchParams.get("prompt"));
  expect(v0.searchParams.get("url")).toBe(
    "https://audiocn-solid.workers.dev/r/solid2/bar-visualizer.json"
  );
});

for (const failure of ["fetch", "clipboard", "registry-payload"] as const) {
  test(`shows the error state and status when ${failure} fails`, async ({
    page,
  }) => {
    if (failure === "clipboard") {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          value: {
            writeText: () => Promise.reject(new Error("Denied")),
            write: () => Promise.reject(new Error("Denied")),
          },
        });
      });
      await page.route(`**${MARKDOWN_URL}`, (route) =>
        route.fulfill({ body: MARKDOWN })
      );
    } else {
      await page.route(
        `**${failure === "fetch" ? MARKDOWN_URL : SOURCE_URL}`,
        (route) =>
          route.fulfill({ status: failure === "fetch" ? 500 : 200, body: "{}" })
      );
    }

    await page.goto(PAGE);

    if (failure === "registry-payload") {
      await page
        .getByRole("button", { name: "More actions for AI agents" })
        .click();
      await page
        .getByRole("menuitem", { name: "Copy component source" })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Copy prompt for AI", exact: true })
        .click();
    }

    await expect(page.locator('[data-slot="error-icon"]')).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveText(
      "Could not copy to clipboard"
    );
  });
}
