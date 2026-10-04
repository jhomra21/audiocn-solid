import type { RehypeShikiOptions } from "@shikijs/rehype";

const TITLE_META = /title="([^"]*)"/u;

const isTitle = (value: string | boolean | undefined): value is string =>
  typeof value === "string";

/** Shiki options for MDX code: both themes as CSS variables and fence `title="…"` as `data-title`. */
export const codeHighlightOptions: RehypeShikiOptions = {
  defaultColor: false,
  parseMetaString: (meta) => {
    const title = TITLE_META.exec(meta)?.[1];

    return title ? { title } : {};
  },
  themes: {
    dark: "github-dark-high-contrast",
    light: "github-light",
  },
  transformers: [
    {
      name: "audiocn:code-title",
      pre(node) {
        const { title } = this.options.meta ?? {};

        if (isTitle(title)) {
          node.properties["data-title"] = title;
        }
      },
    },
  ],
};
