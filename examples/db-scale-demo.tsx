import { DbScale } from "@/components/ui/db-scale";

export const DbScaleDemo = () => (
  <div class="grid w-full max-w-md gap-8">
    <DbScale />
    <DbScale maxDb={6} minDb={-48} taper="audio" />
  </div>
);
