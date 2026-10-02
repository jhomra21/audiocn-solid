type Provider = (props: {
  value: unknown;
  readonly children?: unknown;
}) => unknown;

/**
 * Provides a context value across Solid 1 and Solid 2.
 *
 * Solid 1 stores the provider on `.Provider`; Solid 2 makes the context
 * object itself the provider component.
 */
export const provideContext = <T>(
  context: unknown,
  value: T,
  children: () => unknown
): any => {
  const provider =
    typeof context === "function"
      ? (context as Provider)
      : (context as { Provider: Provider }).Provider;

  return provider({
    value,
    get children() {
      return children();
    },
  });
};
