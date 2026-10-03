import type { Context, JSX } from "solid-js";

type Provider<T> = (props: {
  value: T;
  readonly children?: JSX.Element;
}) => JSX.Element;

type CompatContext<T> = Context<T> | Provider<T>;

/**
 * Provides a context value across Solid 1 and Solid 2.
 *
 * Solid 1 stores the provider on `.Provider`; Solid 2 makes the context
 * object itself the provider component.
 */
export const provideContext = <T>(
  context: CompatContext<T>,
  value: T,
  children: () => JSX.Element
): JSX.Element => {
  const props = {
    value,
    get children() {
      return children();
    },
  };

  if ("Provider" in context) {
    return context.Provider(props);
  }

  return context(props);
};
