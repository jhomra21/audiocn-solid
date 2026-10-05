import { BarVisualizer } from "@/components/ui/bar-visualizer";

const BarVisualizerStates = () => (
  <div class="grid w-full max-w-md gap-6 sm:grid-cols-3">
    <div class="grid gap-2">
      <BarVisualizer
        aria-label="Idle pulse"
        barCount={9}
        class="h-16"
        idle="pulse"
      />
      <span class="text-muted-foreground text-center text-xs">idle pulse</span>
    </div>
    <div class="grid gap-2">
      <BarVisualizer
        aria-label="Idle wave"
        barCount={9}
        class="h-16"
        idle="wave"
      />
      <span class="text-muted-foreground text-center text-xs">idle wave</span>
    </div>
    <div class="grid gap-2">
      <BarVisualizer
        aria-label="Connecting"
        barCount={9}
        class="h-16"
        loading
      />
      <span class="text-muted-foreground text-center text-xs">loading</span>
    </div>
  </div>
);

export default BarVisualizerStates;
