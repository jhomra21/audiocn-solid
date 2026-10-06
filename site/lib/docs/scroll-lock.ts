let locks = 0;

let originalOverflow = "";

/** Each modal owns one release; only the last release restores page scrolling. */
export const lockBodyScroll = (): (() => void) => {
  const body = document.body;

  if (locks++ === 0) {
    originalOverflow = body.style.overflow;
    body.style.overflow = "hidden";
  }

  let released = false;

  return () => {
    if (released) return;
    released = true;

    if (--locks === 0) body.style.overflow = originalOverflow;
  };
};
