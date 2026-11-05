import { TempoControl } from "@/components/ui/tempo-control";

export const TempoControlStates = () => (
  <div class="flex w-full max-w-xs flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <span class="text-muted-foreground text-sm">Small</span>
      <TempoControl aria-label="Small tempo" defaultValue={80} size="sm" />
    </div>
    <div class="flex items-center justify-between gap-4">
      <span class="text-muted-foreground text-sm">Large</span>
      <TempoControl aria-label="Large tempo" defaultValue={128} size="lg" />
    </div>
    <div class="flex items-center justify-between gap-4">
      <span class="text-muted-foreground text-sm">Disabled</span>
      <TempoControl aria-label="Disabled tempo" defaultValue={100} disabled />
    </div>
    <div class="flex items-center justify-between gap-4">
      <span class="text-muted-foreground text-sm">Read-only</span>
      <TempoControl aria-label="Read-only tempo" readOnly value={140} />
    </div>
  </div>
);
