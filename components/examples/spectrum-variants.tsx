import { Spectrum } from "@/components/ui/spectrum";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const SpectrumVariants = () => {
  const signal = useDemoSignal({ bands: 64, kind: "speech" });

  return (
    <div class="grid w-full max-w-lg gap-6">
      <Spectrum
        class="h-28 [--spectrum:var(--meter-ok)]"
        grid={false}
        source={signal.visual}
        variant="line"
      />
      <Spectrum class="h-28" source={signal.visual} variant="area" />
    </div>
  );
};

export default SpectrumVariants;
