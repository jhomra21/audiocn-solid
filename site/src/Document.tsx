import { HydrationScript } from "@solidjs/web";
import type { JSX } from "@solidjs/web/jsx-runtime";

const themeBootstrap = `(() => {
  try {
    const color = localStorage.getItem("audiocn-theme");
    if (color && color !== "stone") document.documentElement.dataset.theme = color;
    const saved = localStorage.getItem("audiocn-appearance");
    const dark = saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
})();`;

export default function Document(props: { children: JSX.Element }) {
  return (
    <html class="font-sans antialiased" lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          content="width=device-width, initial-scale=1"
          name="viewport"
        />
        <script innerHTML={themeBootstrap} />
        <HydrationScript />
      </head>
      <body class="flex min-h-svh flex-col">{props.children}</body>
    </html>
  );
}
