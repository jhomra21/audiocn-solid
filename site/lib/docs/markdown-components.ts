import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { compile } from "@mdx-js/mdx";
import type { Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { toMarkdown } from "mdast-util-to-markdown";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

const readSource = async (path: string) => {
  const file = resolve(repositoryRoot, path);

  if (!file.startsWith(repositoryRoot + sep))
    throw new Error(`Source outside repository: ${path}`);

  return (await readFile(file, "utf8")).trimEnd();
};

type PropRow = [string, string, string | null, string | null];

const cell = (value: string | null) =>
  value === null || value.length === 0
    ? "—"
    : value.replaceAll("|", "\\|").replaceAll("\n", " ");

const code = (value: string) => `\`${value}\``;

const fence = (lang: string, body: string, title?: string) =>
  `\`\`\`${lang}${title === undefined ? "" : ` title="${title}"`}\n${body}\n\`\`\``;

export const markdownComponents = {
  ComponentPreview: async (props: { name: string }) => {
    const path = `components/examples/${props.name}.tsx`;

    return fence("tsx", await readSource(path), path);
  },
  ComponentSource: async (props: { path: string; title?: string }) =>
    fence(
      props.path.endsWith(".css") ? "css" : "tsx",
      await readSource(props.path),
      props.title ?? props.path
    ),
  InstallCommand: (props: { command: string }) => fence("bash", props.command),
  PropsTable: (props: { rows: PropRow[] }) =>
    props.rows.length === 0
      ? "No props."
      : [
          "| Prop | Type | Default | Description |",
          "| --- | --- | --- | --- |",
          ...props.rows.map(
            ([name, type, defaultValue, description]) =>
              `| ${[cell(code(name)), cell(code(type)), cell(defaultValue === null ? null : code(defaultValue)), cell(description)].join(" | ")} |`
          ),
        ].join("\n"),
  Callout: (props: { children?: string; title?: string }) =>
    (props.title === undefined
      ? (props.children ?? "")
      : `**${props.title}**\n\n${props.children ?? ""}`
    )
      .split("\n")
      .map((line) => `>${line ? ` ${line}` : ""}`)
      .join("\n"),
  Steps: (props: { children?: string }) => props.children ?? "",
  Step: (props: { children?: string }) => props.children ?? "",
  Tabs: (props: { children?: string }) => props.children ?? "",
  Tab: (props: { children?: string; value?: string }) =>
    props.value === undefined
      ? (props.children ?? "")
      : `**${props.value}**\n\n${props.children ?? ""}`,
  TypeTable: (props: { children?: string }) => props.children ?? "",
};

type LiteralValue = string | number | boolean | null | LiteralValue[];

interface Expression {
  type: string;
  value?: LiteralValue;
  elements?: Expression[];
  expression?: Expression;
  body?: Expression[];
}

const literal = (node: Expression): LiteralValue => {
  if (node.type === "Literal") return node.value ?? null;

  if (node.type === "ArrayExpression")
    return (node.elements ?? []).map(literal);
  throw new Error(`Non-literal Markdown prop: ${node.type}`);
};

const propsFor = (node: MdxJsxFlowElement) =>
  Object.fromEntries(
    node.attributes.map((attribute) => {
      if (attribute.type !== "mdxJsxAttribute")
        throw new Error("Spread Markdown props are not supported");
      const value = attribute.value;

      if (isString(value) || value === null) return [attribute.name, value];
      // SAFETY: remark-mdx supplies ESTree; only literal and array nodes are accepted by literal().
      const program = value?.data?.estree as Expression | undefined;
      const expression = program?.body?.[0]?.expression;

      if (!expression)
        throw new Error(`Missing literal Markdown prop: ${attribute.name}`);

      return [attribute.name, literal(expression)];
    })
  );

const isString = (value: unknown): value is string => typeof value === "string";

/** Process the real MDX AST, not regex over JSX (which would also eat examples). */
export const renderDocsMarkdown = async (source: string): Promise<string> => {
  let markdown = "";

  const serialize = () => async (tree: Root) => {
    const transform = async (
      children: Root["children"]
    ): Promise<Root["children"]> => {
      const output: Root["children"] = [];

      for (const node of children) {
        if (node.type === "yaml" || node.type === "mdxjsEsm") continue;

        if (node.type === "code" && node.lang === "npm") node.lang = "bash";

        if (
          (node.type === "mdxJsxFlowElement" ||
            node.type === "mdxJsxTextElement") &&
          (node.name === "details" || node.name === "summary")
        ) {
          // SAFETY: only these native wrappers are flattened; their parsed children are standard MDX content.
          output.push(...(await transform(node.children as Root["children"])));
          continue;
        }

        if (node.type === "mdxJsxFlowElement") {
          // SAFETY: unknown names are rejected on the next line, before the renderer is called.
          const component =
            markdownComponents[node.name as keyof typeof markdownComponents];

          if (!component)
            throw new Error(`Missing Markdown form for ${node.name}`);

          // SAFETY: flow element children are root-compatible Markdown blocks after wrapper processing.
          const childrenMarkdown = toMarkdown(
            {
              type: "root",
              children: await transform(node.children as Root["children"]),
            },
            { extensions: [gfmToMarkdown()] }
          ).trim();

          // SAFETY: the finite component map consumes literal MDX props; the parser rejects executable expressions.
          const render = component as (
            props: Record<string, LiteralValue>
          ) => string | Promise<string>;

          output.push({
            type: "html",
            value: await render({
              ...propsFor(node),
              children: childrenMarkdown,
            }),
          });
        } else {
          if ("children" in node) {
            // SAFETY: recursion preserves each parent node's child kinds; only MDX flow wrappers are replaced.
            node.children = (await transform(
              node.children as Root["children"]
            )) as typeof node.children;
          }

          output.push(node);
        }
      }

      return output;
    };

    const copy = structuredClone(tree);
    copy.children = await transform(copy.children);
    markdown = toMarkdown(copy, { extensions: [gfmToMarkdown()] });
  };

  await compile(source, {
    remarkPlugins: [remarkFrontmatter, remarkGfm, serialize],
  });

  return markdown.trim();
};
