import { renderToString } from "solid-js/web";

import { SoundPadProgress } from "@/components/ui/sound-pad";

export const renderProgress = () =>
  renderToString(() => <SoundPadProgress value={0.5} />);
