import { render } from "@solidjs/web";

import { DbReadout } from "@/components/ui/db-readout";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";
import "../src/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

const source = createFrameEmitter<MeterFrame>();
const startedAt = performance.now();
const timer = setInterval(() => {
  const elapsed = (performance.now() - startedAt) / 1000;
  const peakDb = -30 + Math.sin(elapsed * 2.2) * 18;
  source.emit({ channels: [{ peakDb, rmsDb: peakDb - 4 }] });
}, 50);

const dispose = render(
  () => (
    <main
      class="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-8"
      data-runtime="solid-2"
    >
      <section class="grid w-full gap-6 rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
        <header class="grid gap-1">
          <h1 class="text-xl font-semibold">audiocn Solid 2</h1>
          <p class="text-sm text-muted-foreground">
            Runtime acceptance for the shared component source.
          </p>
        </header>

        <div class="grid gap-4" data-testid="readouts">
          <div class="flex items-center justify-between gap-6">
            <span class="text-sm text-muted-foreground">Declarative</span>
            <DbReadout value={-12.3} />
          </div>
          <div class="flex items-center justify-between gap-6">
            <span class="text-sm text-muted-foreground">Live source</span>
            <DbReadout source={source} intervalMs={100} />
          </div>
        </div>
      </section>
    </main>
  ),
  root
);

window.addEventListener(
  "beforeunload",
  () => {
    clearInterval(timer);
    dispose();
  },
  { once: true }
);
