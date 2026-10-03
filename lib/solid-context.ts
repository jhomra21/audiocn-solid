import type { Context } from "solid-js";

interface ProviderProps<T> {
  value: T;
  readonly children?: any;
}

type Provider<T> = (props: ProviderProps<T>) => any;

type CompatContext<T> = Context<T> | Provider<T>;

const hasProvider = <T>(
  context: CompatContext<T>
): context is Context<T> & { Provider: Provider<T> } =>
  "Provider" in context;

const isProvider = <T>(
  context: CompatContext<T>
): context is Provider<T> => context instanceof Function;

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
  const props: ProviderProps<T> = {
    value,
    get children() {
      return children();
    },
  };

  if (hasProvider(context)) {
    return context.Provider(props);
  }

  if (isProvider(context)) {
    return context(props);
  }

  throw new Error("Unsupported Solid context shape.");
};
