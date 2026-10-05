import { For, createSignal } from "solid-js";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { Button } from "@/components/ui/button";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const STATES = [
  { label: "Idle", value: "idle" },
  { label: "Connecting", value: "connecting" },
  { label: "Speaking", value: "speaking" },
] as const;

type VoiceState = (typeof STATES)[number]["value"];

const VoiceTile = () => {
  const [state, setState] = createSignal<VoiceState>("speaking");
  const voice = useDemoSignal({ kind: "speech", seed: 2 });

  return (
    <div class="flex w-full flex-col items-center gap-5">
      <BarVisualizer
        align="center"
        aria-label={`Voice agent, ${state()}`}
        barCount={9}
        class="text-primary h-28 w-full max-w-52"
        idle="wave"
        loading={state() === "connecting"}
        mirrored
        source={state() === "speaking" ? voice.visual : null}
      />
      <div class="bg-muted/60 flex gap-0.5 rounded-lg p-0.5">
        <For each={STATES}>
          {(option) => (
            <Button
              aria-pressed={state() === option.value ? "true" : "false"}
              onClick={() => setState(option.value)}
              size="xs"
              variant={state() === option.value ? "outline" : "ghost"}
            >
              {option.label}
            </Button>
          )}
        </For>
      </div>
    </div>
  );
};

export default VoiceTile;
