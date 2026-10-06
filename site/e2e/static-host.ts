import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, resolve, sep } from "node:path";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mdx", "text/markdown; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const isFile = async (path: string) =>
  stat(path).then(
    (entry) => entry.isFile(),
    () => false
  );

/**
 * The file a static host serves for a request path: the exact file, then
 * `<path>/index.html`, then `<path>.html`. `undefined` means the host
 * answers with its 404 page, including for anything outside `root`.
 */
const resolveStaticFile = async (root: string, pathname: string) => {
  let decoded: string;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  if (decoded.includes("\0")) return undefined;

  const base = resolve(root, `.${decoded}`);

  if (base !== root && !base.startsWith(root + sep)) return undefined;

  for (const candidate of [base, join(base, "index.html"), `${base}.html`]) {
    if (await isFile(candidate)) return candidate;
  }

  return undefined;
};

/**
 * Serves a built `dist/client` the way a static host with a 404 page does:
 * unknown paths get the generated `404.html` with status 404, never the SPA
 * shell. Binds to loopback on a free port so parallel runs cannot collide.
 */
export const startStaticHost = async (root: string) => {
  const directory = resolve(root);

  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://static-host");
    const file = await resolveStaticFile(directory, pathname);
    const served = file ?? join(directory, "404.html");

    // Generated extensionless AI endpoints contain Markdown in index.html.
    // Apply deployment's MIME override only to an existing route, not 404 HTML.
    const markdownRoute =
      file && (pathname === "/llms.mdx" || pathname.startsWith("/llms.mdx/"));

    response.writeHead(file ? 200 : 404, {
      "content-type": markdownRoute
        ? "text/markdown; charset=utf-8"
        : (contentTypes.get(extname(served)) ?? "application/octet-stream"),
    });
    response.end(
      request.method === "HEAD" ? undefined : await readFile(served)
    );
  });

  await new Promise<void>((done) => {
    server.listen(0, "127.0.0.1", done);
  });

  // SAFETY: a server listening on a TCP host and port reports an AddressInfo.
  const { port } = server.address() as AddressInfo;

  return {
    close: () =>
      new Promise<void>((done, fail) => {
        server.close((error) => (error ? fail(error) : done()));
        server.closeAllConnections();
      }),
    origin: `http://127.0.0.1:${port}`,
  };
};
