import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

/**
 * Lists every test block of the upstream audiocn checkout by parsing it, and
 * writes `artifacts/upstream-test-enumeration.json`. A block is a call of
 * `it`, `test` or `describe`, optionally behind `.skip`, `.only`, `.todo`,
 * `.concurrent` or `.each(table)`. Table blocks expand to one case per row.
 *
 * oxc-parser is a transitive dependency of the lockfile; it is not a manifest
 * dependency of this repository, so it is located in the install store.
 *
 * Usage: bun run tools/upstream/enumerate-tests.ts [upstream-checkout]
 */

type NodeChild =
  | Node
  | NodeChild[]
  | string
  | number
  | boolean
  | bigint
  | RegExp
  | null
  | undefined;

/** The parts of an ESTree node this tool reads; every other field is still walked. */
interface Node {
  [key: string]: NodeChild;
  type: string;
  start: number;
  end: number;
  name?: string;
  value?: NodeChild;
  computed?: boolean;
  callee?: Node;
  object?: Node;
  property?: Node;
  arguments?: Node[];
  elements?: NodeChild[];
  expression?: Node;
}

interface Block {
  file: string;
  line: number;
  kind: "it" | "test" | "describe";
  name: string;
  modifiers: string[];
  /** Rows of an `.each` table, or null for a plain block. */
  rows: number | null;
  /** Why the rows could not be counted, when they could not. */
  unresolved?: string;
}

const ROOT = join(import.meta.dir, "../..");

const upstream = process.argv[2] ?? "/tmp/audiocn-ui-ref";

const storeParser = () => {
  const store = join(ROOT, "node_modules/.bun");

  const entry = readdirSync(store).find((name) =>
    name.startsWith("oxc-parser@")
  );

  if (!entry)
    throw new Error("oxc-parser is not installed in node_modules/.bun");

  const load = createRequire(join(store, entry, "node_modules/", "x.js"));

  // SAFETY: oxc-parser 0.139.0 exports parseSync(file, source, { lang }) returning an ESTree program and its errors.
  return load("oxc-parser") as {
    parseSync: (
      file: string,
      source: string,
      options?: { lang?: string }
    ) => { program: Node; errors: readonly object[] };
  };
};

const { parseSync } = storeParser();

const KINDS = new Set(["it", "test", "describe"]);

const MODIFIERS = new Set([
  "skip",
  "only",
  "todo",
  "concurrent",
  "each",
  "fails",
]);

const isNode = (value: NodeChild): value is Node =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof RegExp);

/** The chain `it.skip.each` as ["it", "skip", "each"], or null. */
const chain = (callee: Node | undefined): string[] | null => {
  if (callee?.type === "Identifier") return callee.name ? [callee.name] : null;

  if (callee?.type !== "MemberExpression" || callee.computed) return null;
  const inner = chain(callee.object);
  const name = callee.property?.name;

  return inner && callee.property?.type === "Identifier" && name
    ? [...inner, name]
    : null;
};

/** `[...] as const` and `[...] satisfies T` are still the array literal. */
const unwrap = (node: Node | undefined): Node | undefined => {
  let current = node;

  while (
    current &&
    [
      "TSAsExpression",
      "TSSatisfiesExpression",
      "ParenthesizedExpression",
    ].includes(current.type)
  )
    current = current.expression;

  return current;
};

const text = (node: Node | undefined, source: string): string => {
  if (!node) return "";

  if (node.type === "Literal" && node.value) return String(node.value);

  return source.slice(node.start, node.end);
};

const toKind = (word: string | undefined): Block["kind"] => {
  if (word === "it" || word === "test" || word === "describe") return word;

  throw new Error(`${word} is not a test block`);
};

const lineOf = (source: string, offset: number) =>
  source.slice(0, offset).split("\n").length;

const blocksOf = (file: string, source: string): Block[] => {
  const lang = file.endsWith("x") ? "tsx" : "ts";
  const { program, errors } = parseSync(file, source, { lang });

  if (errors.length > 0) throw new Error(`${file} did not parse cleanly`);
  const found: Block[] = [];

  const modifiersOf = (words: string[]) =>
    words.slice(1).filter((word) => MODIFIERS.has(word));

  const visit = (value: NodeChild) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);

      return;
    }

    if (!isNode(value)) return;

    if (value.type === "CallExpression") {
      const args = value.arguments ?? [];
      const direct = chain(value.callee);
      const outer = chain(value.callee?.callee);

      if (direct && KINDS.has(direct[0] ?? "") && !direct.includes("each")) {
        found.push({
          file,
          kind: toKind(direct[0]),
          line: lineOf(source, value.start),
          modifiers: modifiersOf(direct),
          name: text(args[0], source),
          rows: null,
        });
      } else if (
        value.callee?.type === "CallExpression" &&
        outer?.includes("each")
      ) {
        const table = unwrap(value.callee.arguments?.[0]);

        const block: Block = {
          file,
          kind: toKind(outer[0]),
          line: lineOf(source, value.start),
          modifiers: modifiersOf(outer),
          name: text(args[0], source),
          rows: null,
        };

        if (table?.type === "ArrayExpression")
          block.rows = table.elements?.length ?? 0;
        else block.unresolved = `table is ${table?.type ?? "missing"}`;
        found.push(block);
      }
    }

    for (const child of Object.values(value)) visit(child);
  };

  visit(program);

  return found.sort((a, b) => a.line - b.line);
};

const listTests = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return listTests(path);

    return /\.test\.tsx?$/u.test(entry.name) ? [path] : [];
  });

const files = listTests(upstream).sort();

const blocks = files.flatMap((path) =>
  blocksOf(relative(upstream, path), readFileSync(path, "utf8"))
);

const cases = blocks.filter((block) => block.kind !== "describe");

const tables = cases.filter((block) => block.rows !== null);

const summary = {
  upstream,
  parser: "oxc-parser 0.139.0",
  files: files.length,
  describeBlocks: blocks.length - cases.length,
  testBlocks: cases.length,
  namedBlocks: cases.length - tables.length,
  tableBlocks: tables.length,
  tableRows: tables.reduce((sum, block) => sum + (block.rows ?? 0), 0),
  expandedCases:
    cases.length -
    tables.length +
    tables.reduce((sum, block) => sum + (block.rows ?? 0), 0),
  modified: cases.filter((block) => block.modifiers.some((m) => m !== "each")),
  unresolvedTables: tables.filter((block) => block.unresolved),
};

writeFileSync(
  join(ROOT, "artifacts/upstream-test-enumeration.json"),
  `${JSON.stringify({ ...summary, blocks: cases }, null, 2)}\n`
);

console.log(
  JSON.stringify({ ...summary, modified: summary.modified.length }, null, 2)
);
