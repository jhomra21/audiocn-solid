import { Show, createSignal, createUniqueId } from "solid-js";

import {
  CheckCircleIcon,
  MicrophoneIcon,
  WarningCircleIcon,
} from "@/components/icons/phosphor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AudioDeviceSelect,
  AudioDeviceSelectContent,
  AudioDeviceSelectPreview,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from "@/components/ui/audio-device-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DbReadout } from "@/components/ui/db-readout";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterClip,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack,
} from "@/components/ui/level-meter";
import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  ParameterSlider,
  ParameterSliderControl,
  ParameterSliderHeader,
  ParameterSliderInput,
  ParameterSliderLabel,
  ParameterSliderReset,
} from "@/components/ui/parameter-slider";
import { Switch } from "@/components/ui/switch";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useGainNode } from "@/hooks/use-gain-node";
import { useMicrophone } from "@/hooks/use-microphone";
import { dbToGain } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";
import { cn } from "@/lib/utils";

const CHECK_DURATION_MS = 3000;

type CheckResult = "good" | "quiet" | "loud" | "silent";

const RESULTS = {
  good: {
    description: "Your level sits in the right range.",
    ok: true,
    title: "Sounds good",
  },
  loud: {
    description: "Your voice clipped. Lower the gain.",
    ok: false,
    title: "Too loud",
  },
  quiet: {
    description: "Raise the gain or move closer.",
    ok: false,
    title: "Too quiet",
  },
  silent: {
    description: "Check the device and that it is not muted.",
    ok: false,
    title: "No signal",
  },
};

const judge = (peakDb: number): CheckResult => {
  if (peakDb < -55) return "silent";

  if (peakDb >= -1) return "loud";

  if (peakDb < -30) return "quiet";

  return "good";
};

const useLevelCheck = (meter: FrameSource<MeterFrame>) => {
  const [checking, setChecking] = createSignal(false);
  const [result, setResult] = createSignal<CheckResult | null>(null);
  createCompatEffect(checking, (active) => {
    if (!active) return;
    let peak = Number.NEGATIVE_INFINITY;

    const unsubscribe = meter.subscribe((frame) => {
      for (const level of frame.channels) peak = Math.max(peak, level.peakDb);
    });

    const timer = setTimeout(() => {
      setChecking(false);
      setResult(judge(peak));
    }, CHECK_DURATION_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  });

  return {
    checking,
    result,
    start: () => {
      setResult(null);
      setChecking(true);
    },
  };
};

export interface MicSetupProps {
  deviceId?: string | null;
  onDeviceChange?: (deviceId: string | null) => void;
  gainDb?: number;
  onGainChange?: (gainDb: number) => void;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  autoStart?: boolean;
  class?: string;
  className?: string;
}

export const MicSetup = (props: MicSetupProps) => {
  const muteId = createUniqueId();
  const [started, setStarted] = createSignal(props.autoStart ?? false);
  const [deviceState, setDeviceState] = createSignal<string | null>(null);
  const [gainState, setGainState] = createSignal(0);
  const [mutedState, setMutedState] = createSignal(false);

  const deviceId = () =>
    props.deviceId === undefined ? deviceState() : props.deviceId;

  const gainDb = () => props.gainDb ?? gainState();
  const muted = () => props.muted ?? mutedState();
  const devices = useAudioDevices();

  const microphone = useMicrophone({
    get deviceId() {
      return deviceId();
    },
    get enabled() {
      return started();
    },
  });

  const gain = useGainNode(() => ({
    destination: null,
    gain: muted() ? 0 : dbToGain(gainDb()),
    input: microphone.stream,
  }));

  const analyser = useAudioAnalyser(() => (microphone.stream ? gain : null), {
    historySize: 120,
  });

  const check = useLevelCheck(analyser.meter);
  const active = () => microphone.status === "active";

  const verdict = () => {
    const result = check.result();

    return result ? RESULTS[result] : null;
  };

  const setDevice = (next: string | null) => {
    if (props.deviceId === undefined) setDeviceState(next);
    props.onDeviceChange?.(next);
  };

  const setGain = (next: number) => {
    if (props.gainDb === undefined) setGainState(next);
    props.onGainChange?.(next);
  };

  const setMuted = (next: boolean) => {
    if (props.muted === undefined) setMutedState(next);
    props.onMutedChange?.(next);
  };

  return (
    <Card class={cn(props.class, props.className)}>
      <CardHeader>
        <CardTitle>Microphone</CardTitle>
        <CardDescription>
          Pick a microphone and check your level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Device</FieldLabel>
            <AudioDeviceSelect
              devices={devices.devices}
              loading={devices.isLoading}
              onRequestPermission={() => void devices.requestPermission()}
              onValueChange={setDevice}
              permission={
                devices.permission === "unsupported"
                  ? "denied"
                  : devices.permission
              }
              value={deviceId()}
            >
              <AudioDeviceSelectTrigger>
                <MicrophoneIcon class="text-muted-foreground" />
                <AudioDeviceSelectValue placeholder="Default microphone" />
              </AudioDeviceSelectTrigger>
              <AudioDeviceSelectContent />
            </AudioDeviceSelect>
            <AudioDeviceSelectPreview class="relative">
              <Show when={!active()}>
                <Button
                  class="absolute inset-0 z-10 m-auto w-fit"
                  onClick={() => setStarted(true)}
                  size="xs"
                  variant="outline"
                >
                  Turn on microphone
                </Button>
              </Show>
              <LiveWaveform
                active={active() && !muted()}
                aria-label="Microphone preview"
                barWidth={2}
                class="h-10"
                mode="scrolling"
                source={analyser.visual}
              />
            </AudioDeviceSelectPreview>
          </Field>
          <Field>
            <div class="flex items-center justify-between">
              <FieldLabel>Level</FieldLabel>
              <DbReadout
                class="text-muted-foreground text-xs"
                holdMs={500}
                source={analyser.meter}
              />
            </div>
            <LevelMeter aria-label="Microphone level" source={analyser.meter}>
              <LevelMeterChannels>
                <LevelMeterChannel>
                  <LevelMeterTrack>
                    <LevelMeterBar />
                    <LevelMeterHold />
                  </LevelMeterTrack>
                </LevelMeterChannel>
                <LevelMeterScale />
              </LevelMeterChannels>
              <LevelMeterClip />
            </LevelMeter>
          </Field>
          <ParameterSlider
            max={24}
            min={-24}
            onValueChange={setGain}
            origin={0}
            resetValue={0}
            unit="dB"
            value={gainDb()}
          >
            <ParameterSliderHeader>
              <ParameterSliderLabel>Gain</ParameterSliderLabel>
              <ParameterSliderReset />
              <ParameterSliderInput />
            </ParameterSliderHeader>
            <ParameterSliderControl />
          </ParameterSlider>
          <Field orientation="horizontal">
            <Switch checked={muted()} id={muteId} onCheckedChange={setMuted} />
            <FieldLabel for={muteId}>Mute microphone</FieldLabel>
          </Field>
          <div class="flex flex-col gap-3">
            <Button
              class="self-start"
              disabled={!active() || check.checking()}
              onClick={check.start}
              variant="outline"
            >
              {check.checking() ? "Listening… say a few words" : "Check level"}
            </Button>
            <Show when={verdict()}>
              {(result) => (
                <Alert variant={result().ok ? "default" : "destructive"}>
                  <Show when={result().ok} fallback={<WarningCircleIcon />}>
                    <CheckCircleIcon />
                  </Show>
                  <AlertTitle>{result().title}</AlertTitle>
                  <AlertDescription>{result().description}</AlertDescription>
                </Alert>
              )}
            </Show>
            <Show when={microphone.status === "denied"}>
              <Alert variant="destructive">
                <WarningCircleIcon />
                <AlertTitle>Microphone blocked</AlertTitle>
                <AlertDescription>
                  Allow microphone access in your browser's site settings.
                </AlertDescription>
              </Alert>
            </Show>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
