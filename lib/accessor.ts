import type { Accessor } from "solid-js";

export type MaybeAccessor<T> = T | Accessor<T>;

const isAccessor = <T>(value: MaybeAccessor<T>): value is Accessor<T> =>
  typeof value === "function";

export const readMaybeAccessor = <T>(value: MaybeAccessor<T>): T =>
  isAccessor(value) ? value() : value;
