import { writeFile } from "node:fs/promises";

import { loadStargazersCount } from "../lib/github-stars";

const stargazersCount = await loadStargazersCount();

if (stargazersCount === undefined) {
  console.warn(
    "Star count fetch returned nothing usable; keeping the existing static count."
  );
} else {
  await writeFile(
    new URL("../lib/github-stars.json", import.meta.url),
    `${JSON.stringify({ stargazersCount }, null, 2)}\n`
  );

  console.info(`Built static star count: ${stargazersCount}.`);
}
