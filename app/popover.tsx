import { DismissableLayer } from "@kobalte/core/dismissable-layer";
import { Show, createSignal } from "solid-js";

import VolumeControlPopover from "@/components/examples/volume-control-popover";

const TouchLayers = () => {
  const [outer, setOuter] = createSignal(true);
  const [inner, setInner] = createSignal(false);
  const [mounted, setMounted] = createSignal(true);
  const [modal, setModal] = createSignal(false);
  const [prevent, setPrevent] = createSignal(false);
  const [outsideCalls, setOutsideCalls] = createSignal(0);
  const [dismissals, setDismissals] = createSignal(0);
  const [activations, setActivations] = createSignal(0);
  let excluded: HTMLDivElement | undefined;

  return (
    <main class="min-h-[200vh] p-8">
      <div data-testid="outside" class="fixed bottom-4 left-4 h-16 w-40">
        Blank outside
      </div>
      <button
        data-testid="outside-action"
        class="fixed bottom-24 left-4 h-16 w-40"
        onClick={() => setActivations(activations() + 1)}
      >
        <span data-testid="outside-child">Outside action</span>
      </button>
      <div
        ref={(node) => {
          excluded = node;
        }}
        data-testid="excluded"
        class="fixed right-4 bottom-4"
      >
        Excluded container
        <button data-testid="reopen" onClick={() => setOuter(true)}>
          Reopen
        </button>
        <button data-testid="mount" onClick={() => setMounted(!mounted())}>
          Toggle mount
        </button>
        <button data-testid="modal" onClick={() => setModal(!modal())}>
          Toggle modal
        </button>
        <button data-testid="prevent" onClick={() => setPrevent(!prevent())}>
          Toggle prevention
        </button>
        <output data-testid="outside-calls">{outsideCalls()}</output>
        <output data-testid="dismissals">{dismissals()}</output>
        <output data-testid="activations">{activations()}</output>
      </div>
      <Show when={mounted() && outer()}>
        <DismissableLayer
          data-testid="outer-layer"
          class="fixed top-40 left-40 h-56 w-80 bg-white"
          disableOutsidePointerEvents={modal()}
          excludedElements={[() => excluded]}
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            setOutsideCalls(outsideCalls() + 1);

            if (prevent()) event.preventDefault();
          }}
          onDismiss={() => {
            setDismissals(dismissals() + 1);
            setOuter(false);
          }}
        >
          <div data-testid="inside">Inside layer</div>
          <button data-testid="close" onClick={() => setOuter(false)}>
            Close
          </button>
          <button data-testid="open-inner" onClick={() => setInner(true)}>
            Open inner
          </button>
          <Show when={inner()}>
            <DismissableLayer
              data-testid="inner-layer"
              class="fixed top-80 left-64 h-24 w-40 bg-white"
              disableOutsidePointerEvents={modal()}
              onFocusOutside={(event) => event.preventDefault()}
              onDismiss={() => setInner(false)}
            >
              Nested layer
            </DismissableLayer>
          </Show>
        </DismissableLayer>
      </Show>
    </main>
  );
};

export const PopoverApp = () =>
  new URLSearchParams(location.search).has("touch-layers") ? (
    <TouchLayers />
  ) : (
    <main class="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1>Popover contracts</h1>
      <VolumeControlPopover />
      <button class="fixed bottom-4 left-4">Outside popover</button>
    </main>
  );
