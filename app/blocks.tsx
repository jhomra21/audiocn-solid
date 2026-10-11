import { Show, createSignal } from "solid-js";

import { MicSetup } from "@/components/blocks/mic-setup/mic-setup";
import { MusicPlayer } from "@/components/blocks/music-player/music-player";
import { QuickAudioPopover } from "@/components/blocks/quick-audio-popover/quick-audio-popover";
import { Soundboard } from "@/components/blocks/soundboard/soundboard";
import { MixerSourceStrip } from "@/components/blocks/system-audio-mixer/mixer-source-strip";
import { SystemAudioMixer } from "@/components/blocks/system-audio-mixer/system-audio-mixer";
import { SystemAudioSettings } from "@/components/blocks/system-audio-settings/system-audio-settings";
import {
  FieldSet,
  FieldLegend,
  FieldTitle,
  FieldSeparator,
  FieldError,
} from "@/components/ui/field";
import {
  ParameterSlider,
  ParameterSliderHeader,
  ParameterSliderInput,
  ParameterSliderLabel,
} from "@/components/ui/parameter-slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AudioContextProvider,
  getSharedAudioContext,
} from "@/hooks/use-audio-context";
import { useMixer } from "@/hooks/use-mixer";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";
import { useDemoSounds, useDemoTracks } from "@/lib/docs/use-demo-audio";

const SILENT_METER = { subscribe: () => () => {} };

const DEMO_TRACKS = [{ id: "demo", src: "demo.wav", title: "Demo" }];

interface GainSchedule {
  at: number;
  /** The context time when the schedule was made. */
  madeAt: number;
  value: number;
}

interface BlockProbe {
  emitVoice: (frame: MeterFrame) => void;
  gainSchedules: GainSchedule[];
  mediaStreamSources: number;
  streamReports: number;
}

declare global {
  interface Window {
    blockProbe: BlockProbe;
  }
}

/** Counts what the blocks ask of the shared context, which stays real. */
const probeSharedContext = () => {
  const context = getSharedAudioContext();

  if (!context) throw new Error("This page has no AudioContext");
  const voice = createFrameEmitter<MeterFrame>();
  const createGain = context.createGain.bind(context);
  const createSource = context.createMediaStreamSource.bind(context);

  const probe: BlockProbe = {
    emitVoice: (frame) => voice.emit(frame),
    gainSchedules: [],
    mediaStreamSources: 0,
    streamReports: 0,
  };

  context.createGain = () => {
    const node = createGain();
    const setTarget = node.gain.setTargetAtTime.bind(node.gain);
    node.gain.setTargetAtTime = (value, at, timeConstant) => {
      probe.gainSchedules.push({ at, madeAt: context.currentTime, value });

      return setTarget(value, at, timeConstant);
    };

    return node;
  };

  context.createMediaStreamSource = (stream) => {
    probe.mediaStreamSources += 1;

    return createSource(stream);
  };

  window.blockProbe = probe;

  return { context, probe, voice };
};

const DuckingCase = () => {
  const { context, voice } = probeSharedContext();

  return (
    <AudioContextProvider context={context}>
      <MusicPlayer defaultTracks={DEMO_TRACKS} duckingSource={voice} />
    </AudioContextProvider>
  );
};

const SystemRerenderCase = () => {
  const { context, probe } = probeSharedContext();
  const [ticks, setTicks] = createSignal(0);

  navigator.mediaDevices.getDisplayMedia = () =>
    Promise.resolve(context.createMediaStreamDestination().stream);

  return (
    <AudioContextProvider context={context}>
      <button onClick={() => setTicks((count) => count + 1)}>Tick</button>
      <SystemAudioSettings
        class={`tick-${ticks()}`}
        onStreamChange={() => {
          probe.streamReports += 1;
        }}
      />
    </AudioContextProvider>
  );
};

const TwiceCase = () => (
  <>
    <MicSetup />
    <MicSetup />
    <MusicPlayer defaultTracks={DEMO_TRACKS} duckingSource={null} />
    <MusicPlayer defaultTracks={DEMO_TRACKS} duckingSource={null} />
    <SystemAudioSettings />
    <SystemAudioSettings />
  </>
);

export const BlocksApp = () => {
  switch (new URLSearchParams(location.search).get("case")) {
    case "twice":
      return <TwiceCase />;
    case "system-enabled":
      return <SystemAudioSettings enabled onEnabledChange={() => {}} />;
    case "system-rerender":
      return <SystemRerenderCase />;
    case "ducking":
      return <DuckingCase />;
    default:
      return <BlocksGallery />;
  }
};

const BlocksGallery = () => {
  const tracks = useDemoTracks();
  const sounds = useDemoSounds();
  const [clearTracks, setClearTracks] = createSignal(false);
  const [clearSounds, setClearSounds] = createSignal(false);
  const [boardMounted, setBoardMounted] = createSignal(true);
  const [capture, setCapture] = createSignal(true);
  const [processed, setProcessed] = createSignal<MediaStream | null>(null);
  const [mixed, setMixed] = createSignal<MediaStream | null>(null);
  const [selectedTab, setSelectedTab] = createSignal("first");
  const [tabRef, setTabRef] = createSignal("waiting");
  const [formValue, setFormValue] = createSignal("");
  const countOptions = { ownedWrite: true, name: "BlocksApp.created" };
  const [created, setCreated] = createSignal(0, countOptions);
  const [trim, setTrim] = createSignal(0);
  const probe = useMixer({ channels: [{ id: "probe" }] });

  const Counted = (props: { label: string }) => {
    setCreated((count) => count + 1);

    return <span>{props.label}</span>;
  };

  const [errors, setErrors] = createSignal<{ message: string }[]>([
    { message: "Permission denied" },
    { message: "Permission denied" },
  ]);

  const [board, setBoard] = createSignal<
    | import("@/components/blocks/soundboard/soundboard").SoundboardSound[]
    | undefined
  >(undefined);

  return (
    <main class="mx-auto grid max-w-xl gap-6 p-6">
      <section data-testid="tabs-default">
        <Tabs
          activationMode="automatic"
          dir="rtl"
          ref={() => setTabRef("connected")}
        >
          <TabsList>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
            <TabsTrigger value="alpha">Alpha</TabsTrigger>
            <TabsTrigger value="beta">Beta</TabsTrigger>
          </TabsList>
          <TabsContent value="alpha" forceMount>
            Alpha content
          </TabsContent>
          <TabsContent value="beta" forceMount>
            Beta content
          </TabsContent>
        </Tabs>
        <output data-testid="tabs-ref">{tabRef()}</output>
      </section>
      <form
        data-testid="switch-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFormValue(
            data.has("capture") ? `capture=${data.get("capture")}` : "empty"
          );
        }}
      >
        <label for="capture-input">Capture input</label>
        <Switch id="capture-input" name="capture" value="yes" defaultChecked />
        <Switch
          aria-label="Disabled input"
          name="disabled"
          defaultChecked
          disabled
        />
        <Switch aria-label="Locked input" name="locked" value="yes" checked />
        <button type="submit">Read form</button>
        <button type="reset">Reset form</button>
        <output>{formValue()}</output>
      </form>
      <section data-testid="field-contract">
        <FieldSet>
          <FieldLegend>Capture preferences</FieldLegend>
          <FieldTitle>Devices</FieldTitle>
          <FieldSeparator>Input</FieldSeparator>
          <FieldError errors={errors()} />
        </FieldSet>
        <button
          onClick={() =>
            setErrors([
              { message: "Permission denied" },
              { message: "Device disconnected" },
            ])
          }
        >
          Show more errors
        </button>
        <button onClick={() => setErrors([])}>Clear errors</button>
      </section>
      <section data-testid="single-creation">
        <FieldSeparator>
          <Counted label="Separator" />
        </FieldSeparator>
        <FieldError>
          <Counted label="Error" />
        </FieldError>
        <MixerSourceStrip
          id="probe"
          title="Probe"
          icon={<span />}
          mixer={probe}
          meter={SILENT_METER}
          description={<Counted label="Description" />}
          actions={<Counted label="Actions" />}
        />
        <output>{`created=${created()}`}</output>
      </section>
      <section data-testid="negative-input">
        <ParameterSlider
          min={-24}
          max={24}
          value={trim()}
          onValueChange={setTrim}
        >
          <ParameterSliderHeader>
            <ParameterSliderLabel>Trim</ParameterSliderLabel>
            <ParameterSliderInput />
          </ParameterSliderHeader>
        </ParameterSlider>
        <output>{`trim=${trim()}`}</output>
      </section>
      <section data-testid="tabs-unmatched">
        <Tabs value="missing">
          <TabsList aria-label="Unmatched">
            <TabsTrigger value="off" disabled>
              Off
            </TabsTrigger>
            <TabsTrigger value="on">On</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>
      <section data-testid="tabs-contract">
        <Tabs
          value={selectedTab()}
          onValueChange={setSelectedTab}
          activationMode="manual"
          orientation="vertical"
        >
          <TabsList aria-label="Settings">
            <TabsTrigger value="first">First setting</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled setting
            </TabsTrigger>
            <TabsTrigger value="second">Second setting</TabsTrigger>
          </TabsList>
          <TabsContent value="first">First panel</TabsContent>
          <TabsContent value="second">Second panel</TabsContent>
        </Tabs>
        <button onClick={() => setSelectedTab("first")}>
          Reset selected tab
        </button>
      </section>
      <section data-testid="mixer-block">
        <SystemAudioMixer
          tracks={tracks()}
          sounds={sounds()}
          onOutputChange={setMixed}
        />
      </section>
      <output data-testid="mixer-output">{mixed() ? "active" : "none"}</output>
      <Show when={capture()}>
        <section data-testid="mic-block">
          <MicSetup />
        </section>
        <section data-testid="system-settings-block">
          <SystemAudioSettings onStreamChange={setProcessed} />
        </section>
        <QuickAudioPopover />
      </Show>
      <output data-testid="processed-stream">
        {processed() ? "active" : "none"}
      </output>
      <button onClick={() => setCapture(false)}>Remove capture blocks</button>
      <section data-testid="music-block">
        <MusicPlayer tracks={clearTracks() ? [] : tracks()} />
      </section>
      <button onClick={() => setClearTracks(true)}>Clear music tracks</button>
      <section data-testid="soundboard-block">
        <Show when={boardMounted()}>
          <Soundboard
            sounds={board() ?? (clearSounds() ? [] : sounds())}
            onSoundsChange={setBoard}
          />
        </Show>
      </section>
      <button onClick={() => setBoardMounted((mounted) => !mounted)}>
        Toggle board
      </button>
      <button
        onClick={() => {
          setClearSounds(true);
          setBoard([]);
        }}
      >
        Clear board sounds
      </button>
    </main>
  );
};
