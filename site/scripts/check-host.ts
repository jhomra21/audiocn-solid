const siteUrl = (
  process.env.AUDIOCN_SITE_URL ?? process.env.VITE_AUDIOCN_SITE_URL
)?.replace(/\/+$/u, "");

if (!siteUrl) {
  throw new Error(
    "Set AUDIOCN_SITE_URL or VITE_AUDIOCN_SITE_URL to the deployed HTTPS origin."
  );
}

const get = (pathname: string) =>
  fetch(`${siteUrl}${pathname}`, { redirect: "follow" });

const expectStatus = async (pathname: string, status = 200) => {
  const response = await get(pathname);

  if (response.status !== status) {
    throw new Error(
      `${pathname}: expected HTTP ${status}, received ${response.status}.`
    );
  }

  return response;
};

for (const pathname of [
  "/",
  "/docs",
  "/docs/components/fader",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/llms-full.txt",
]) {
  await expectStatus(pathname);
}

for (const pathname of [
  "/docs/components/fader.md",
  "/docs/hooks/use-mixer.md",
]) {
  const response = await expectStatus(pathname);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("text/markdown")) {
    throw new Error(
      `${pathname}: expected text/markdown, received "${contentType}".`
    );
  }
}

for (const runtime of ["solid1", "solid2"]) {
  const response = await expectStatus(`/r/${runtime}/registry.json`);
  const registry = await response.json();

  if (!Array.isArray(registry.items) || registry.items.length !== 65) {
    throw new Error(
      `${runtime}: expected 65 registry items, received ${registry.items?.length ?? "none"}.`
    );
  }

  const mixerResponse = await expectStatus(`/r/${runtime}/mixer.json`);
  const mixer = await mixerResponse.json();

  if (!mixer.registryDependencies?.includes("@audiocn-solid/channel-strip")) {
    throw new Error(
      `${runtime}/mixer: channel-strip registry dependency is missing.`
    );
  }
}

const missing = await expectStatus(
  "/__audiocn-solid-host-check-not-found__",
  404
);

const missingBody = await missing.text();

if (!/page not found/i.test(missingBody)) {
  throw new Error(
    "The deployed 404 response did not contain the not-found page."
  );
}

console.log(`Hosted release checks passed for ${siteUrl}.`);
