import { createSignal } from "solid-js";

import PanControlKnob from "@/components/examples/pan-control-knob";
import { AudioDeviceSelect } from "@/components/ui/audio-device-select";
import { AudioPlayer } from "@/components/ui/audio-player";
import { MuteToggle } from "@/components/ui/channel-toggle";
import { Fader } from "@/components/ui/fader";
import {
  Knob,
  KnobCap,
  KnobDial,
  KnobLabel,
  KnobScale,
  KnobValue,
  parseKnobValue,
} from "@/components/ui/knob";
import { formatPan, PanControl, parsePan } from "@/components/ui/pan-control";
import {
  ParameterSlider,
  ParameterSliderControl,
  ParameterSliderLabel,
} from "@/components/ui/parameter-slider";
import {
  SoundPad,
  SoundPadGrid,
  SoundPadProgress,
} from "@/components/ui/sound-pad";
import { VolumeControl } from "@/components/ui/volume-control";
import { AudioConfigProvider } from "@/hooks/use-audio-config";
import type { AudioPlayerController } from "@/hooks/use-audio-player";
import type { JSXElement } from "@/lib/solid/jsx-types";

interface ControlEvent {
  value: string;
  reason: string;
  type: "change" | "commit";
}

interface ControlCallbacks {
  onValueChange: (
    value: number | boolean,
    details?: { reason: string }
  ) => void;
  onValueCommitted: (value: number) => void;
}

const ControlCase = (props: {
  id: string;
  render: (callbacks: ControlCallbacks) => JSXElement;
}) => {
  const eventOptions = {
    ownedWrite: true,
    name: "controls.events",
  };

  const [events, setEvents] = createSignal<ControlEvent[]>([], eventOptions);
  const [details, setDetails] = createSignal("");

  const record = (
    value: number | boolean,
    reason: string,
    type: ControlEvent["type"]
  ) =>
    setEvents((previous) => [
      ...previous,
      { value: String(value), reason, type },
    ]);

  const callbacks: ControlCallbacks = {
    onValueChange: (value, nextDetails) => {
      record(value, nextDetails?.reason ?? "", "change");
      setDetails(JSON.stringify(nextDetails));
    },
    onValueCommitted: (value) => record(value, "", "commit"),
  };

  return (
    <section
      class="grid min-h-28 gap-3 rounded-lg border p-4"
      data-testid={props.id}
    >
      <h2>{props.id}</h2>
      {props.render(callbacks)}
      <output class="text-xs break-all">{JSON.stringify(events())}</output>
      <output data-testid="change-details" hidden>
        {details()}
      </output>
    </section>
  );
};

const ControlEffects = () => {
  const [loading, setLoading] = createSignal(false);
  const [triggers, setTriggers] = createSignal(0);

  const stopOptions = { ownedWrite: true, name: "controls.stops" };
  const [stops, setStops] = createSignal(0, stopOptions);
  const [time, setTime] = createSignal(12);
  const [revision, setRevision] = createSignal(0);

  const timeOptions = {
    ownedWrite: true,
    name: "controls.times",
  };

  const [times, setTimes] = createSignal<number[]>([], timeOptions);

  const player: AudioPlayerController = {
    buffered: 0,
    get currentTime() {
      return time();
    },
    duration: 220,
    element: null,
    error: null,
    loop: false,
    muted: false,
    pause: () => undefined,
    play: () => Promise.resolve(),
    playbackRate: 1,
    playing: false,
    seek: setTime,
    setLoop: () => undefined,
    setMuted: () => undefined,
    setPlaybackRate: () => undefined,
    setVolume: () => undefined,
    status: "paused",
    time: { subscribe: () => () => undefined },
    toggle: () => Promise.resolve(),
    volume: 1,
  };

  return (
    <section class="grid gap-3 rounded-lg border p-4" data-testid="effects">
      <SoundPadGrid hotkeys hotkeyScope="global">
        <SoundPad
          hotkey="a"
          mode="hold"
          loading={loading()}
          onTrigger={() => setTriggers((count) => count + 1)}
          onStop={() => setStops((count) => count + 1)}
        >
          Held pad
        </SoundPad>
      </SoundPadGrid>
      <button onClick={() => setLoading((value) => !value)}>
        {loading() ? "Unload held pad" : "Load held pad"}
      </button>
      <output data-testid="pad-triggers">{triggers()}</output>
      <output data-testid="pad-stops">{stops()}</output>
      <SoundPadProgress value={0.5} />
      <AudioPlayer
        aria-label={`Effect player ${revision()}`}
        player={player}
        onTimeUpdate={(next) => setTimes((previous) => [...previous, next])}
      />
      <button onClick={() => setRevision((value) => value + 1)}>
        Unrelated player update
      </button>
      <button onClick={() => player.seek(13)}>Advance player time</button>
      <output data-testid="player-times">{JSON.stringify(times())}</output>
    </section>
  );
};

export const ControlsApp = () => {
  const [revision, setRevision] = createSignal(0);

  return (
    <main class="mx-auto grid max-w-4xl grid-cols-2 gap-4 p-6">
      <h1 class="col-span-2">Control contracts</h1>
      <ControlCase
        id="fader-mic"
        render={(callbacks) => (
          <Fader aria-label="Mic" defaultValue={-6} {...callbacks} />
        )}
      />
      <ControlCase
        id="fader-steps"
        render={(callbacks) => <Fader defaultValue={0} {...callbacks} />}
      />
      <ControlCase
        id="fader-silence"
        render={(callbacks) => (
          <Fader defaultValue={0} silenceAtMin {...callbacks} />
        )}
      />
      <ControlCase
        id="fader-commit"
        render={(callbacks) => <Fader defaultValue={-3} {...callbacks} />}
      />
      <ControlCase
        id="fader-controlled"
        render={(callbacks) => <Fader value={-12} {...callbacks} />}
      />
      <ControlCase
        id="parameter-sync"
        render={(callbacks) => (
          <ParameterSlider
            min={-1000}
            max={1000}
            step={5}
            unit="ms"
            {...callbacks}
          >
            <ParameterSliderLabel>Sync</ParameterSliderLabel>
            <ParameterSliderControl />
          </ParameterSlider>
        )}
      />
      <ControlCase
        id="parameter-controlled"
        render={(callbacks) => (
          <ParameterSlider
            value={0}
            max={10}
            step={1}
            class={`revision-${revision()}`}
            {...callbacks}
          >
            <ParameterSliderLabel>Rejected parameter</ParameterSliderLabel>
            <ParameterSliderControl />
          </ParameterSlider>
        )}
      />
      <button onClick={() => setRevision((value) => value + 1)}>
        Unrelated parameter update
      </button>
      <ControlCase
        id="knob-basic"
        render={(callbacks) => (
          <Knob defaultValue={50} allowWheel {...callbacks}>
            <KnobDial style={{ "--from-test": "1" }} />
            <KnobLabel>Basic gain</KnobLabel>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-disabled"
        render={(callbacks) => (
          <Knob defaultValue={50} allowWheel disabled {...callbacks}>
            <KnobDial />
            <KnobValue />
            <KnobLabel>Disabled gain</KnobLabel>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-drag"
        render={(callbacks) => <Knob defaultValue={50} {...callbacks} />}
      />
      <ControlCase
        id="knob-circular"
        render={(callbacks) => (
          <Knob defaultValue={50} dragDirection="circular" {...callbacks} />
        )}
      />
      <ControlCase
        id="knob-dead-zone"
        render={(callbacks) => (
          <Knob defaultValue={50} dragDirection="circular" {...callbacks} />
        )}
      />
      <ControlCase
        id="knob-editor"
        render={(callbacks) => (
          <Knob defaultValue={50} {...callbacks}>
            <KnobDial />
            <KnobValue />
            <KnobLabel>Editable gain</KnobLabel>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-scale"
        render={(callbacks) => (
          <Knob defaultValue={33} {...callbacks}>
            <KnobDial>
              <KnobScale labelEvery={10} majorEvery={5} ticks={100} />
            </KnobDial>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-bipolar"
        render={(callbacks) => (
          <Knob defaultValue={-12} min={-24} max={24} origin={0} {...callbacks}>
            <KnobDial>
              <KnobScale labelEvery={0} ticks={48} />
            </KnobDial>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-cap"
        render={(callbacks) => (
          <Knob defaultValue={50} {...callbacks}>
            <KnobDial>
              <KnobCap />
            </KnobDial>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-mini"
        render={(callbacks) => (
          <Knob defaultValue={50} {...callbacks}>
            <KnobDial>
              <KnobCap variant="mini" />
            </KnobDial>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-quiet"
        render={(callbacks) => <Knob defaultValue={50} {...callbacks} />}
      />
      <ControlCase
        id="knob-click"
        render={(callbacks) => (
          <Knob defaultValue={58} clickSound {...callbacks} />
        )}
      />
      <ControlCase
        id="knob-click-scale"
        render={(callbacks) => (
          <Knob defaultValue={33} clickSound {...callbacks}>
            <KnobDial>
              <KnobScale majorEvery={5} ticks={100} />
            </KnobDial>
          </Knob>
        )}
      />
      <ControlCase
        id="knob-parse"
        render={(callbacks) => (
          <Knob defaultValue={50} min={-2000} max={2000} {...callbacks}>
            <KnobDial />
            <KnobValue />
            <KnobLabel>Typed gain</KnobLabel>
          </Knob>
        )}
      />
      <section data-testid="pan-example">
        <PanControlKnob />
      </section>
      <section data-testid="pan-disabled">
        <AudioConfigProvider value={{ disabled: true }}>
          <PanControlKnob />
        </AudioConfigProvider>
      </section>
      <section data-testid="pan-slider">
        <PanControl defaultValue={0.25} />
      </section>
      <ControlCase
        id="mute-toggle"
        render={(callbacks) => (
          <MuteToggle
            onPressedChange={(value, event) =>
              callbacks.onValueChange(value, { reason: event.type })
            }
          >
            M
          </MuteToggle>
        )}
      />
      <ControlCase
        id="volume-zero"
        render={(callbacks) => (
          <VolumeControl
            defaultValue={0}
            onValueChange={callbacks.onValueChange}
          />
        )}
      />
      <section data-testid="device-selected">
        <AudioDeviceSelect
          defaultValue="usb"
          devices={[
            { id: "default", label: "Built-in" },
            { id: "usb", label: "USB mic" },
          ]}
        />
      </section>
      <section data-testid="device-missing">
        <AudioDeviceSelect
          defaultValue="gone"
          devices={[{ id: "a", label: "A" }]}
        />
      </section>
      <section data-testid="device-none">
        <AudioDeviceSelect allowNone devices={[]} noneLabel="No microphone" />
      </section>
      <ControlEffects />
      <output data-testid="knob-parsing">
        {JSON.stringify([
          String(parseKnobValue("−12 dB")),
          String(parseKnobValue("1.2k")),
          String(parseKnobValue("gain")),
        ])}
      </output>
      <output data-testid="pan-formatting">
        {JSON.stringify([
          formatPan(0),
          formatPan(-0.3),
          formatPan(1),
          String(parsePan("L30")),
          String(parsePan("r15")),
          String(parsePan("C")),
          String(parsePan("-50")),
          String(parsePan("left")),
        ])}
      </output>
    </main>
  );
};
