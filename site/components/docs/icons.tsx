import type { ComponentProps, JSX } from "@solidjs/web";

// Lucide icon geometry (ISC), matching the icons upstream's fumadocs layout renders.
const icon =
  (paths: () => JSX.Element, fill = "none") =>
  (props: ComponentProps<"svg">) => (
    <svg
      aria-hidden="true"
      fill={fill}
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths()}
    </svg>
  );

export const PanelLeftIcon = icon(() => (
  <>
    <rect height="18" rx="2" width="18" x="3" y="3" />
    <path d="M9 3v18" />
  </>
));

export const SearchIcon = icon(() => (
  <>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </>
));

export const SunIcon = icon(
  () => (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  "currentColor"
);

export const MoonIcon = icon(
  () => (
    <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  ),
  "currentColor"
);

export const ClipboardIcon = icon(() => (
  <>
    <rect height="4" rx="1" ry="1" width="8" x="8" y="2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </>
));

export const CopyIcon = icon(() => (
  <>
    <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>
));

export const CheckIcon = icon(() => <path d="M20 6 9 17l-5-5" />);

export const LinkIcon = icon(() => (
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
));

export const TextAlignStartIcon = icon(() => (
  <>
    <path d="M21 5H3" />
    <path d="M15 12H3" />
    <path d="M17 19H3" />
  </>
));

export const ChevronDownIcon = icon(() => <path d="m6 9 6 6 6-6" />);

export const InfoIcon = icon(() => (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>
));
