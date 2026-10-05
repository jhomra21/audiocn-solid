import VolumeControlPopover from "@/components/examples/volume-control-popover";

export const PopoverApp = () => (
  <main class="flex min-h-screen flex-col items-center justify-center gap-8">
    <h1>Popover contracts</h1>
    <VolumeControlPopover />
    <button class="fixed bottom-4 left-4">Outside popover</button>
  </main>
);
