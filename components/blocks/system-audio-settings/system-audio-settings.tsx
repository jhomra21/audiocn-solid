import { Show, createSignal, createUniqueId, onCleanup } from "solid-js";

import {
  DesktopIcon,
  InfoIcon,
  WarningIcon,
} from "@/components/icons/phosphor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { LevelMeter } from "@/components/ui/level-meter";
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
import { useAudioContext } from "@/hooks/use-audio-context";
import { useGainNode } from "@/hooks/use-gain-node";
import { useSystemAudio } from "@/hooks/use-system-audio";
import { dbToGain } from "@/lib/audio/decibels";
import { createCompatEffect } from "@/lib/solid/effect";
import { cn } from "@/lib/utils";

const DEFAULT_GAIN_DB = -6;

const STATE_LABELS = {
  active: "On",
  denied: "Needs permission",
  ended: "Ended",
  idle: "Off",
  "no-audio": "No audio shared",
  prompting: "Choose what to share…",
  unsupported: "Unsupported",
};

export interface SystemAudioSettingsProps {
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  gainDb?: number;
  onGainChange?: (gainDb: number) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  class?: string;
  className?: string;
}

export const SystemAudioSettings = (props: SystemAudioSettingsProps) => {
  const enabledId = createUniqueId();
  const system = useSystemAudio();
  const { context } = useAudioContext();
  const [gainState, setGainState] = createSignal(DEFAULT_GAIN_DB);
  const gainDb = () => props.gainDb ?? gainState();
  const output = context?.createMediaStreamDestination() ?? null;

  const gain = useGainNode(() => ({
    destination: output,
    gain: dbToGain(gainDb()),
    input: system.stream,
  }));

  const analyser = useAudioAnalyser(() => (system.stream ? gain : null), {
    channels: "stereo",
  });

  const active = () => system.status === "active";

  const processed = () =>
    context && gain && output && system.stream ? output.stream : null;

  createCompatEffect(processed, (stream) => {
    props.onStreamChange?.(stream);
  });
  onCleanup(() => {
    for (const track of output?.stream.getTracks() ?? []) track.stop();
    props.onStreamChange?.(null);
  });
  createCompatEffect(
    () => props.enabled,
    (enabled) => {
      if (
        enabled === true &&
        system.status !== "active" &&
        system.status !== "prompting"
      )
        void system.start();
      else if (enabled === false) system.stop();
    }
  );

  const setEnabled = (next: boolean) => {
    props.onEnabledChange?.(next);

    if (props.enabled !== undefined && props.enabled !== next) return;

    if (next) void system.start();
    else system.stop();
  };

  const setGain = (next: number) => {
    if (props.gainDb === undefined) setGainState(next);
    props.onGainChange?.(next);
  };

  return (
    <Card class={cn(props.class, props.className)}>
      <CardHeader>
        <CardTitle>
          <span class="flex items-center gap-2">
            <DesktopIcon />
            System audio
          </span>
        </CardTitle>
        <CardDescription>
          Add the sound from your computer to your recording or stream.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <div class="flex flex-wrap items-center gap-2">
                <FieldLabel for={enabledId}>Capture system audio</FieldLabel>
                <Badge variant={active() ? "default" : "secondary"}>
                  {STATE_LABELS[system.status]}
                </Badge>
              </div>
              <FieldDescription>
                Your browser asks what to share. Choose a screen or tab and turn
                on its audio.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={active() || system.status === "prompting"}
              disabled={!system.isSupported}
              id={enabledId}
              onCheckedChange={setEnabled}
            />
          </Field>
          <ParameterSlider
            disabled={!active()}
            max={12}
            min={-24}
            onValueChange={setGain}
            origin={0}
            resetValue={DEFAULT_GAIN_DB}
            unit="dB"
            value={gainDb()}
          >
            <ParameterSliderHeader>
              <ParameterSliderLabel>Level</ParameterSliderLabel>
              <ParameterSliderReset />
              <ParameterSliderInput />
            </ParameterSliderHeader>
            <ParameterSliderControl />
          </ParameterSlider>
          <Show when={active()}>
            <LevelMeter
              aria-label="System audio level"
              channelCount={2}
              source={analyser.meter}
            />
          </Show>
          <Show
            when={system.isSupported}
            fallback={
              <Alert variant="destructive">
                <WarningIcon />
                <AlertTitle>Not available in this browser</AlertTitle>
                <AlertDescription>
                  This browser cannot capture system audio. Try a Chromium-based
                  browser.
                </AlertDescription>
              </Alert>
            }
          >
            <Alert>
              <InfoIcon />
              <AlertTitle>What gets captured</AlertTitle>
              <AlertDescription>
                Everything the shared screen, window or tab plays. Some browsers
                only offer tab audio.
              </AlertDescription>
            </Alert>
          </Show>
          <Show when={system.status === "denied"}>
            <Alert variant="destructive">
              <WarningIcon />
              <AlertTitle>Capture was not started</AlertTitle>
              <AlertDescription>
                No screen or tab was shared. Turn capture on again and approve
                the browser's sharing request. If access is blocked, allow
                screen sharing in your browser or system settings.
              </AlertDescription>
            </Alert>
          </Show>
          <Show when={system.status === "no-audio"}>
            <Alert variant="destructive">
              <WarningIcon />
              <AlertTitle>No audio was shared</AlertTitle>
              <AlertDescription>
                Turn capture on again and tick the option to share audio.
              </AlertDescription>
            </Alert>
          </Show>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
