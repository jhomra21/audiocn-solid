import type { Context } from "solid-js";

type Provider<T> = (props: {
  value: T;
  readonly children?: any;
}) => any;

type CompatContext<T> = Context<T> | Provider<T>;

const hasProvider = <T>(
  context: CompatContext<T>
): context is Context<T> & { Provider: Provider<T> } =>
  "Provider" in context;

/**
 * Provides a context value across Solid 1 and Solid 2.
 *
 * Solid 1 stores the provider on `.Provider`; Solid 2 makes the context
 * object itself the provider component.
 */
export const provideContext = <T>(
  context: CompatContext<T>,
  value: T,
  children: () => any
) => {
  const props = {
    value,
    get children() {
      return children();
    },
  };

  if (hasProvider(context)) {
    return context.Provider(props);
  }

  return context(props);
};
