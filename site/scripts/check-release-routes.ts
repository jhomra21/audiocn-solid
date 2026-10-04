import { readPrerenderedRoutes } from "./prerendered-routes";

const failures = (await readPrerenderedRoutes()).flatMap(
  ({ items, page, route }) =>
    page ? [`${route} (page)`] : items.map((item) => `${route}: ${item}`)
);

if (failures.length > 0) {
  throw new Error(
    `Release build contains not-yet-ported content:\n${failures.join("\n")}`
  );
}
