import { renderToString } from "solid-js/web";

import { LevelMeter } from "@/components/ui/level-meter";

export const renderMeter = () =>
  renderToString(() => <LevelMeter aria-label="Mic" peakDb={-12} />);
