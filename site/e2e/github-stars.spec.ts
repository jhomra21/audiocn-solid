import { expect, test } from "@playwright/test";

import { loadStargazersCount } from "../lib/github-stars";
import stars from "../lib/github-stars.json" with { type: "json" };

const full = new Intl.NumberFormat("en-US").format(stars.stargazersCount);

const compact = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  notation: "compact",
})
  .format(stars.stargazersCount)
  .toLowerCase();

test("star count build validates the response and falls back on failure", async () => {
  const respond =
    (body: string, status = 200) =>
    async () =>
      new Response(body, { status });

  expect(await loadStargazersCount(respond('{"stargazers_count":1234}'))).toBe(
    1234
  );
  expect(await loadStargazersCount(respond('{"stargazers_count":0}'))).toBe(0);

  for (const invalid of [
    "null",
    "[]",
    "{}",
    '{"stargazers_count":"12"}',
    '{"stargazers_count":-1}',
    '{"stargazers_count":1.5}',
    `{"stargazers_count":${Number.MAX_SAFE_INTEGER + 1}}`,
  ]) {
    expect(await loadStargazersCount(respond(invalid))).toBeUndefined();
  }

  expect(
    await loadStargazersCount(respond('{"stargazers_count":5}', 503))
  ).toBeUndefined();
  expect(
    await loadStargazersCount(async () => new Response("not JSON"))
  ).toBeUndefined();
  expect(
    await loadStargazersCount(async () => {
      throw new Error("request timed out");
    })
  ).toBeUndefined();
  await loadStargazersCount(async (url, options) => {
    expect(url).toBe("https://api.github.com/repos/jhomra21/audiocn-solid");
    expect(options?.redirect).toBe("error");
    expect(options?.signal).toBeInstanceOf(AbortSignal);

    return Response.json({ stargazers_count: 1 });
  });
  await test.info().attach("star-count-snapshot", {
    body: JSON.stringify(stars),
    contentType: "application/json",
  });
});

test("the navbar shows the star count with a tooltip on hover and focus", async ({
  page,
}) => {
  await page.goto("/");

  const link = page
    .locator("header")
    .getByRole("link", { name: `${full} stars on GitHub` });

  await expect(link).toHaveAttribute(
    "href",
    "https://github.com/jhomra21/audiocn-solid"
  );
  await expect(link).toHaveText(compact);
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await link.hover();
  await expect(page.getByRole("tooltip")).toHaveText(`${full} stars`);

  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await link.focus();
  await expect(page.getByRole("tooltip")).toHaveText(`${full} stars`);
});

test("the docs sidebar footer shows the star count", async ({ page }) => {
  await page.goto("/docs/components/knob");

  const link = page
    .locator("aside")
    .getByRole("link", { name: `${full} stars on GitHub` });

  await expect(link).toBeVisible();
  await link.hover();
  await expect(page.getByRole("tooltip")).toHaveText(`${full} stars`);
});
