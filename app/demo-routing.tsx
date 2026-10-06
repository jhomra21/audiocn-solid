import ChannelStripConsole from "@/components/examples/channel-strip-console";
import ChannelStripDemo from "@/components/examples/channel-strip-demo";
import FaderWithMeter from "@/components/examples/fader-with-meter";
import MixerConsole from "@/components/examples/mixer-console";
import MixerDemo from "@/components/examples/mixer-demo";

/**
 * Mounts one real example by its component name. The home tiles belong to the
 * site, which runs only Solid 2 with its own solid-js copy, so root tests do
 * not mount them.
 */
export const DemoRoutingApp = () => {
  switch (new URLSearchParams(location.search).get("case")) {
    case "ChannelStripConsole":
      return <ChannelStripConsole />;
    case "ChannelStripDemo":
      return <ChannelStripDemo />;
    case "FaderWithMeter":
      return <FaderWithMeter />;
    case "MixerConsole":
      return <MixerConsole />;
    case "MixerDemo":
      return <MixerDemo />;
    default:
      throw new Error("Unknown demo-routing case");
  }
};
