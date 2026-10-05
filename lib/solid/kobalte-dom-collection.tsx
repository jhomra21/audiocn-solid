import {
  DomCollectionContext,
  useDomCollectionContext,
} from "@kobalte/core/primitives/create-dom-collection";
import type { DomCollectionContextValue } from "@kobalte/core/primitives/create-dom-collection";

import { provideContext } from "@/lib/solid/context";
import type { JSXElement } from "@/lib/solid/jsx-types";

/**
 * Kobalte alpha.2's collection unregister writes its signal synchronously.
 * Solid 2 rejects that write when a keyed computation disposes a menu. Defer
 * only unregister, through the public context, until disposal has finished.
 * Registration, ordering, keyboard state and all callbacks remain Kobalte's.
 */
export const KobalteDomCollectionScope = (props: { children?: JSXElement }) => {
  const collection = useDomCollectionContext();

  const deferred: DomCollectionContextValue = {
    registerItem: (item) => {
      const unregister = collection.registerItem(item);

      return () => queueMicrotask(unregister);
    },
  };

  return provideContext(DomCollectionContext, deferred, () => props.children);
};
