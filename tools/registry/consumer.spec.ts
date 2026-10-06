import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { startStaticHost } from "../../site/e2e/static-host";
import { root, run } from "./runner";

const reportPath =
  process.env.AUDIOCN_INSTALL_REPORT ??
  join(root, "artifacts/registry-install.json");

test("every item has an independent consumer install, build and license proof", async () => {
  const report = JSON.parse(await readFile(reportPath, "utf8"));

  expect(report.pass).toBe(true);

  const fixtures = new Set<string>();

  for (const runtime of report.runtimes) {
    expect(runtime.items).toHaveLength(65);

    for (const item of runtime.items) {
      expect(item.installed, item.name).toBe(true);
      expect(item.typecheck, item.name).toBe(true);
      expect(item.build, item.name).toBe(true);
      expect(item.license, item.name).toBe(true);
      expect(item.reactPackages, item.name).toEqual([]);
      expect(item.files.length, item.name).toBeGreaterThan(0);

      const installed = new Set(
        item.installedDependencies.map((dependency) => dependency.name)
      );

      for (const dependency of item.npmDependencies)
        expect(
          installed.has(dependency.replace(/@[^@/]+$/u, "")),
          item.name
        ).toBe(true);
      expect(fixtures.has(item.fixture)).toBe(false);
      fixtures.add(item.fixture);
    }
  }

  expect(fixtures.size).toBe(130);
});

for (const runtime of ["solid1", "solid2"]) {
  for (const name of ["level-meter", "music-player"]) {
    test(`documented ${runtime} bootstrap renders isolated ${name} without React`, async ({
      page,
    }, info) => {
      test.setTimeout(60_000);
      const report = JSON.parse(await readFile(reportPath, "utf8"));

      const fixture = report.runtimes
        .find((entry) => entry.runtime === runtime)
        .items.find((entry) => entry.name === name).fixture;

      const component = name === "level-meter" ? "LevelMeter" : "MusicPlayer";

      const path =
        name === "level-meter"
          ? "@/components/ui/level-meter"
          : "@/components/blocks/music-player/music-player";

      const props =
        name === "level-meter"
          ? 'aria-label="Microphone level" peakDb={-12}'
          : "";

      await writeFile(
        join(fixture, "src/App.tsx"),
        `import { ${component} } from "${path}";\nexport default function App() { return <${component} ${props} />; }\n`
      );
      await run("bunx", ["--bun", "shadcn@4.21.0", "info"], fixture);
      await run("bun", ["run", "typecheck"], fixture);
      await run("bun", ["run", "build"], fixture);
      const host = await startStaticHost(join(fixture, "dist"));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      try {
        await page.goto(host.origin);

        if (name === "level-meter")
          await expect(page.locator('[data-slot="level-meter"]')).toBeVisible();
        else
          await expect(
            page.getByText("No music", { exact: true })
          ).toBeVisible();
        expect(errors).toEqual([]);
        await info.attach(`${runtime}-${name}-consumer`, {
          body: JSON.stringify({ fixture, errors, runtime, name }),
          contentType: "application/json",
        });
        await page.screenshot({
          fullPage: true,
          path: join(
            root,
            "artifacts",
            `registry-bootstrap-${runtime}-${name}.png`
          ),
        });
      } finally {
        await host.close();
      }
    });
  }

  test(`${runtime} isolated typecheck rejects an undeclared adapter mutation`, async ({
    browserName,
  }, info) => {
    expect(browserName).toBe("chromium");
    const report = JSON.parse(await readFile(reportPath, "utf8"));

    const fixture = report.runtimes
      .find((entry) => entry.runtime === runtime)
      .items.find((entry) => entry.name === "level-meter").fixture;

    const target = join(fixture, "src/lib/solid/kobalte-slider.ts");

    const source = await readFile(
      join(root, "lib/solid/kobalte-slider.ts"),
      "utf8"
    );

    await writeFile(target, source);

    try {
      const child = spawn("bun", ["run", "typecheck"], {
        cwd: fixture,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const chunks: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
      const [code] = await once(child, "close");
      const diagnostics = Buffer.concat(chunks).toString();

      expect(code).not.toBe(0);
      expect(diagnostics).toContain("TS2307");
      expect(diagnostics).toContain("@kobalte/core/slider");
      await info.attach(`${runtime}-undeclared-adapter-rejected`, {
        body: JSON.stringify({ fixture, code, diagnostics }),
        contentType: "application/json",
      });
    } finally {
      await unlink(target);
    }

    await run("bun", ["run", "typecheck"], fixture);
  });
}
