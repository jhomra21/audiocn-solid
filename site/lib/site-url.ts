export const parseSiteOrigin = (value: string): string => {
  if (
    value !== value.trim() ||
    !/^https:\/\/[^/?#\s]+\/?$/iu.test(value.replace(/\/+$/u, ""))
  ) {
    throw new Error(
      "Hosted site URL must be an HTTPS origin without credentials, path, query, or fragment."
    );
  }

  let url: URL;

  try {
    url = new URL(value.replace(/\/+$/u, ""));
  } catch {
    throw new Error(`Invalid hosted site origin: "${value}".`);
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Hosted site URL must be an HTTPS origin without credentials, path, query, or fragment."
    );
  }

  return url.origin;
};
