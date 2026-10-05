import { Show, createSignal, onCleanup } from "solid-js";

import { AudioContextProvider } from "@/hooks/use-audio-context";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useGainNode } from "@/hooks/use-gain-node";
import { useLevel } from "@/hooks/use-level";
import { useSystemAudio } from "@/hooks/use-system-audio";
import type { MeterFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";

interface HookProbeProps {
  context: AudioContext;
  setConnections: (count: number) => void;
}

const HookProbe = (props: HookProbeProps) => {
  const [subscriptions, setSubscriptions] = createSignal(0);
  const listeners = new Set<(frame: MeterFrame) => void>();
  const [enabled, setEnabled] = createSignal(true);
  const [channel, setChannel] = createSignal<number | "max">("max");

  const level = useLevel(
    {
      subscribe(listener) {
        listeners.add(listener);
        setSubscriptions(listeners.size);

        return () => {
          listeners.delete(listener);
          setSubscriptions(listeners.size);
        };
      },
    },
    () => ({ enabled: enabled(), channel: channel(), intervalMs: 20 })
  );

  const [gain, setGain] = createSignal(0);
  const input = props.context.createConstantSource();
  input.offset.value = 0;
  input.start();
  onCleanup(() => input.stop());
  const connect = input.connect.bind(input);
  const disconnect = input.disconnect.bind(input);
  function connectProbe(
    destination: AudioNode,
    output?: number,
    channel?: number
  ): AudioNode;
  function connectProbe(destination: AudioParam, output?: number): void;
  function connectProbe(
    destination: AudioNode | AudioParam,
    output = 0,
    channel = 0
  ) {
    props.setConnections(1);

    if (destination instanceof AudioParam) return connect(destination, output);

    return connect(destination, output, channel);
  }

  input.connect = connectProbe;

  input.disconnect = (
    destination?: AudioNode | AudioParam | number,
    output?: number,
    channel?: number
  ) => {
    if (destination instanceof AudioNode) {
      if (channel !== undefined) disconnect(destination, output ?? 0, channel);
      else if (output !== undefined) disconnect(destination, output);
      else disconnect(destination);
    } else if (destination instanceof AudioParam) {
      if (output !== undefined) disconnect(destination, output);
      else disconnect(destination);
    } else if (destination !== undefined) disconnect(destination);
    else disconnect();
    props.setConnections(0);
  };

  const node = useGainNode(() => ({ input, gain: gain() }));
  const [measuredGain, setMeasuredGain] = createSignal(0);
  const timer = setInterval(() => setMeasuredGain(node?.gain.value ?? -1), 20);
  onCleanup(() => clearInterval(timer));

  const devices = useAudioDevices();
  const capture = useSystemAudio();
  const [stoppedTracks, setStoppedTracks] = createSignal(0);
  let labelled = false;
  let reverse = false;
  const pending: ((devices: MediaDeviceInfo[]) => void)[] = [];
  let resolvePicker: ((stream: MediaStream) => void) | undefined;
  let captured: MediaStream | null = null;

  const device = (label: string): MediaDeviceInfo => ({
    deviceId: "default",
    groupId: "studio",
    kind: "audioinput",
    label,
    toJSON: () => ({ label }),
  });

  const watchStop = (track: MediaStreamTrack) => {
    const stop = track.stop.bind(track);
    track.stop = () => {
      if (track.readyState !== "ended") setStoppedTracks((count) => count + 1);
      stop();
    };

    return track;
  };

  const media = navigator.mediaDevices;
  const originalEnumerate = media.enumerateDevices;
  const originalUserMedia = media.getUserMedia;
  const originalDisplay = media.getDisplayMedia;

  media.enumerateDevices = () =>
    reverse
      ? new Promise((resolve) => pending.push(resolve))
      : Promise.resolve([device(labelled ? "Studio microphone" : "")]);
  media.getUserMedia = async () => {
    labelled = true;
    const stream = props.context.createMediaStreamDestination().stream;

    for (const track of stream.getTracks()) watchStop(track);

    return stream;
  };

  media.getDisplayMedia = () =>
    new Promise((resolve) => {
      resolvePicker = resolve;
    });

  onCleanup(() => {
    media.enumerateDevices = originalEnumerate;
    media.getUserMedia = originalUserMedia;
    media.getDisplayMedia = originalDisplay;

    for (const track of captured?.getTracks() ?? []) track.stop();
  });

  const reverseRefresh = async () => {
    reverse = true;
    const first = devices.refresh();
    const second = devices.refresh();
    pending[1]([device("Newest microphone")]);
    pending[0]([device("Obsolete microphone")]);
    await Promise.all([first, second]);
    reverse = false;
  };

  const resolveCapture = () => {
    const canvas = document.createElement("canvas");
    const video = canvas.captureStream().getVideoTracks()[0];

    const audio = props.context
      .createMediaStreamDestination()
      .stream.getAudioTracks()[0];

    captured = new MediaStream([watchStop(video), watchStop(audio)]);
    resolvePicker?.(captured);
    resolvePicker = undefined;
  };

  return (
    <section>
      <output data-testid="subscriptions">{subscriptions()}</output>
      <output data-testid="level">
        {level.peakDb}/{level.rmsDb}/{level.zone}
      </output>
      <button
        onClick={() => {
          for (const emit of listeners)
            emit({
              channels: [
                { peakDb: -3, rmsDb: -12 },
                { peakDb: -30, rmsDb: -36 },
              ],
            });
        }}
      >
        Emit frame
      </button>
      <button
        onClick={() => {
          for (const emit of listeners)
            emit({
              channels: [
                { peakDb: 0, rmsDb: -2 },
                { peakDb: 0, rmsDb: -2 },
              ],
            });
        }}
      >
        Emit clipping
      </button>
      <button onClick={() => setChannel(1)}>Second channel</button>
      <button onClick={() => setEnabled((value) => !value)}>
        {enabled() ? "Disable sampling" : "Enable sampling"}
      </button>
      <output data-testid="gain">
        {Math.round(measuredGain() * 100) / 100}
      </output>
      <button onClick={() => setGain(0.5)}>Set gain</button>
      <output data-testid="devices">
        {devices.devices.map((item) => item.label).join(", ")}
      </output>
      <output data-testid="permission">{devices.permission}</output>
      <button onClick={() => void devices.requestPermission()}>
        Request permission
      </button>
      <button onClick={() => void reverseRefresh()}>
        Reverse refresh results
      </button>
      <output data-testid="capture-status">{capture.status}</output>
      <output data-testid="capture-stream">
        {capture.stream ? "active" : "none"}
      </output>
      <output data-testid="stopped-tracks">{stoppedTracks()}</output>
      <button onClick={() => void capture.start()}>Start capture</button>
      <button onClick={capture.stop}>Stop capture</button>
      <button onClick={resolveCapture}>Resolve picker</button>
      <button
        onClick={() =>
          captured?.getAudioTracks()[0].dispatchEvent(new Event("ended"))
        }
      >
        End capture
      </button>
    </section>
  );
};

export const AudioHooksApp = () => {
  const context = new AudioContext();
  const [mounted, setMounted] = createSignal(true);
  const [connections, setConnections] = createSignal(0);
  const [gains, setGains] = createSignal(0);
  let createdGains = 0;
  const createGain = context.createGain.bind(context);
  context.createGain = () => {
    createdGains++;

    return createGain();
  };

  onCleanup(() => void context.close());
  createCompatEffect(
    () => mounted(),
    () => {
      setGains(createdGains);
    }
  );

  return (
    <main>
      <h1>Audio hook contracts</h1>
      <button onClick={() => void context.resume()}>Resume audio</button>
      <AudioContextProvider context={context}>
        <Show when={mounted()}>
          <HookProbe context={context} setConnections={setConnections} />
        </Show>
      </AudioContextProvider>
      <button onClick={() => setMounted(false)}>Remove hooks</button>
      <output data-testid="remaining-connections">{connections()}</output>
      <output data-testid="created-gains">{gains()}</output>
    </main>
  );
};
