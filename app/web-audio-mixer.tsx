import { Show, createSignal, onCleanup } from "solid-js";

import {
  AudioContextProvider,
  getSharedAudioContext,
} from "@/hooks/use-audio-context";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useMixer } from "@/hooks/use-mixer";
import { useWebAudioMixer } from "@/hooks/use-web-audio-mixer";
import type { MeterFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";

interface ProbeProps {
  context: AudioContext;
  connections: (count: number) => void;
}

const MixProbe = (props: ProbeProps) => {
  const mixer = useMixer({ channels: [{ id: "music" }, { id: "mic" }] });
  const [enabled, setEnabled] = createSignal(true);
  const [mic, setMic] = createSignal(true);
  const music = props.context.createOscillator();
  const level = props.context.createGain();
  level.gain.value = 0.2;
  music.connect(level);
  music.start();
  const microphone = props.context.createConstantSource();
  microphone.offset.value = 0;
  microphone.start();
  let connections = 0;
  const connect = level.connect.bind(level);
  const disconnect = level.disconnect.bind(level);
  function watchConnect(
    destination: AudioNode,
    output?: number,
    input?: number
  ): AudioNode;
  function watchConnect(destination: AudioParam, output?: number): void;
  function watchConnect(
    destination: AudioNode | AudioParam,
    output = 0,
    input = 0
  ) {
    if (destination instanceof AudioParam) return connect(destination, output);
    props.connections(++connections);

    return connect(destination, output, input);
  }

  level.connect = watchConnect;
  level.disconnect = (
    destination?: AudioNode | AudioParam | number,
    output?: number,
    input?: number
  ) => {
    if (destination instanceof AudioNode) {
      if (input !== undefined) disconnect(destination, output ?? 0, input);
      else if (output !== undefined) disconnect(destination, output);
      else disconnect(destination);
      props.connections(--connections);
    } else if (destination instanceof AudioParam)
      disconnect(destination, output ?? 0);
    else if (destination !== undefined) disconnect(destination);
    else {
      disconnect();
      connections = 0;
      props.connections(0);
    }
  };

  onCleanup(() => {
    music.stop();
    microphone.stop();
    music.disconnect();
  });

  const graph = useWebAudioMixer(mixer, () => ({
    inputs: { music: level, mic: mic() ? microphone : null },
    enabled: enabled(),
    analyser: { fftSize: 256 },
    ducking: { trigger: "mic", targets: ["music"], releaseMs: 50 },
  }));

  const firstRelay = graph.meters.music;
  const [peak, setPeak] = createSignal(Number.NEGATIVE_INFINITY);
  const [left, setLeft] = createSignal(Number.NEGATIVE_INFINITY);
  const [right, setRight] = createSignal(Number.NEGATIVE_INFINITY);
  useFrameSource(
    () => graph.meters.music,
    (frame: MeterFrame) => {
      setLeft(frame.channels[0]?.peakDb ?? Number.NEGATIVE_INFINITY);
      setRight(frame.channels[1]?.peakDb ?? Number.NEGATIVE_INFINITY);
      setPeak(Math.max(...frame.channels.map((channel) => channel.peakDb)));
    }
  );
  const [stable, setStable] = createSignal(true);
  createCompatEffect(
    () => graph.output,
    () => {
      setStable(graph.meters.music === firstRelay);
    }
  );

  return (
    <section class="grid gap-2">
      <output data-testid="mix-output">
        {graph.output?.active ? "live" : "none"}
      </output>
      <output data-testid="relay-stable">{String(stable())}</output>
      <output data-testid="music-peak">{peak()}</output>
      <output data-testid="music-left">{left()}</output>
      <output data-testid="music-right">{right()}</output>
      <button onClick={() => void props.context.resume()}>Resume mix</button>
      <button onClick={() => mixer.setMuted("music", true)}>Mute music</button>
      <button onClick={() => mixer.setMuted("music", false)}>
        Unmute music
      </button>
      <button onClick={() => mixer.setPan("music", -1)}>Pan music left</button>
      <button onClick={() => mixer.setSolo("mic", true)}>
        Solo microphone
      </button>
      <button onClick={() => mixer.setSolo("mic", false)}>Clear solo</button>
      <button
        onClick={() =>
          microphone.offset.setValueAtTime(0.5, props.context.currentTime)
        }
      >
        Speak
      </button>
      <button
        onClick={() => {
          setMic(false);
          mixer.removeChannel("mic");
        }}
      >
        Remove microphone
      </button>
      <button onClick={() => setEnabled(false)}>Disable mix</button>
      <button onClick={() => setEnabled(true)}>Enable mix</button>
    </section>
  );
};

export const WebAudioMixerApp = () => {
  const context = getSharedAudioContext();
  const [mounted, setMounted] = createSignal(true);
  const [connections, setConnections] = createSignal(0);

  return (
    <main class="grid gap-4 p-4">
      <h1>Web Audio mixer contracts</h1>
      <Show when={mounted() && context}>
        <AudioContextProvider context={context!}>
          <MixProbe context={context!} connections={setConnections} />
        </AudioContextProvider>
      </Show>
      <output data-testid="input-connections">{connections()}</output>
      <button onClick={() => setMounted(false)}>Remove mix</button>
    </main>
  );
};
