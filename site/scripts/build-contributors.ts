import { writeFile } from "node:fs/promises";

import { loadContributors } from "../lib/contributors";

const contributors = await loadContributors();

if (contributors.length === 0) {
  console.warn(
    "Contributor fetch returned nobody; keeping the existing static contributor list."
  );
} else {
  await writeFile(
    new URL("../lib/contributors.json", import.meta.url),
    `${JSON.stringify(contributors, null, 2)}\n`
  );

  console.info(
    `Built static contributor list with ${contributors.length} people.`
  );
}
