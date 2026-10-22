<div align="center">

<a href="https://audiocn-solid.jhonra121.workers.dev">
  <img src="site/public/og/home-14a5416dabae.png" alt="audiocn: a Solid audio mixer with meters, faders, knobs and a waveform." width="100%" />
</a>

<p><strong>Audio components for Solid, built the shadcn way.</strong><br />
Level meters, visualizers, faders, knobs, channel strips, a complete mixer, players and sound pads.<br />
Copy, paste, make them yours.</p>
<p>A Solid port of <a href="https://github.com/audiocn/ui">audiocn/ui</a>.</p>

<p>
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/components"><img src="https://shieldcn.dev/badge/components-23.svg?logo=lu:AudioLines&amp;mode=light&amp;valueColor=10b981" alt="23 components" /></a>
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks"><img src="https://shieldcn.dev/badge/blocks-6.svg?logo=lu:LayoutDashboard&amp;mode=light&amp;valueColor=10b981" alt="6 blocks" /></a>
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-audio-analyser"><img src="https://shieldcn.dev/badge/hooks-18.svg?logo=lu:Webhook&amp;mode=light&amp;valueColor=10b981" alt="18 hooks" /></a>
  <a href="./license.md"><img src="https://shieldcn.dev/badge/license-MIT.svg?logo=lu:Scale&amp;mode=light&amp;valueColor=10b981" alt="MIT license" /></a>
</p>

<p>
  <a href="https://www.solidjs.com"><img src="https://shieldcn.dev/badge/Solid-1%20%2B%202.svg?logo=solid&amp;variant=secondary&amp;mode=dark" alt="Solid 1 and Solid 2" /></a>
  <a href="https://ui.shadcn.com/docs/registry"><img src="https://shieldcn.dev/badge/shadcn%2Fui-registry.svg?logo=shadcnui&amp;variant=secondary&amp;mode=dark" alt="shadcn/ui registry" /></a>
  <a href="https://tailwindcss.com"><img src="https://shieldcn.dev/badge/Tailwind%20CSS-v4.svg?logo=tailwindcss&amp;variant=secondary&amp;mode=dark" alt="Tailwind CSS v4" /></a>
  <a href="https://developer.mozilla.org/docs/Web/API/Web_Audio_API"><img src="https://shieldcn.dev/badge/Web%20Audio-API.svg?logo=lu:AudioWaveform&amp;variant=secondary&amp;mode=dark" alt="Web Audio API" /></a>
</p>

<p>
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs"><strong>Docs</strong></a> ·
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/installation"><strong>Installation</strong></a> ·
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/components"><strong>Components</strong></a> ·
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks"><strong>Blocks</strong></a> ·
  <a href="https://audiocn-solid.jhonra121.workers.dev/docs/concepts/theming"><strong>Theming</strong></a>
</p>

</div>

## Why audiocn

- **You own the code.** audiocn is not a runtime component package. The shadcn CLI copies source into your project, where you can change anything.
- **Themed by shadcn.** Styled with Tailwind CSS and the standard shadcn CSS variables. Your theme styles the components.
- **Meters and visualizers** draw on animation frames using canvas or DOM updates.
- **Bring your own audio.** Components receive levels and values; they never open a microphone themselves. Use the included Web Audio hooks, or feed them from another engine.
- **Real units.** Mixer components speak decibels, the way audio engineers do.
- **Accessible.** Keyboard control, ARIA roles and reduced-motion support are built in.

## Components

<table>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/mixer"><img src="site/public/og/mixer-51f748ca9f67.png" alt="Mixer: channel strips, shared metering and keyboard navigation." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/level-meter"><img src="site/public/og/level-meter-5a0d4ae19443.png" alt="Level Meter: peak and RMS, stereo channels, peak hold and clip detection." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/knob"><img src="site/public/og/knob-5208933ad2d3.png" alt="Knob: rotary controls for gain, pan and frequency." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/waveform"><img src="site/public/og/waveform-765f8287128f.png" alt="Waveform: a clip with a playhead, seeking, regions and markers." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/electric-waveform"><img src="site/public/og/electric-waveform-2936bc92a662.png" alt="Electric Waveform: a bright core with branching arcs." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/electric-bar-visualizer"><img src="site/public/og/components-electric-bar-visualizer-c5fe116d9ce1.png" alt="Electric Bar Visualizer: frequency bands drawn as electric filaments." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/spectrum"><img src="site/public/og/components-spectrum-55bf80ac9d51.png" alt="Spectrum: a frequency analyser with axes, grid and peak hold." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/smooth-waveform"><img src="site/public/og/components-smooth-waveform-8c93ccfafa17.png" alt="Smooth Waveform: a clean line that follows the sound." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/audio-player"><img src="site/public/og/components-audio-player-5328fa31b40c.png" alt="Audio Player: transport, seeking, time, volume, rate and loop." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/components/sound-pad"><img src="site/public/og/components-sound-pad-354561ef7f59.png" alt="Sound Pad: trigger pads with modes, hotkeys, progress and accent colours." /></a></td>
  </tr>
</table>

<details>
<summary><strong>All 23 components</strong></summary>

<br />

**Meters and visualizers**

| Component | What it does |
| --- | --- |
| [Level Meter](https://audiocn-solid.jhonra121.workers.dev/docs/components/level-meter) | Peak and RMS meter with zones, peak hold, a scale, readout and clip light |
| [dB Scale](https://audiocn-solid.jhonra121.workers.dev/docs/components/db-scale) | Tick marks and labels for decibel ranges |
| [dB Readout](https://audiocn-solid.jhonra121.workers.dev/docs/components/db-readout) | Numeric level label that updates at a readable rate |
| [Clip Indicator](https://audiocn-solid.jhonra121.workers.dev/docs/components/clip-indicator) | Latched clip light with a count and reset |
| [Bar Visualizer](https://audiocn-solid.jhonra121.workers.dev/docs/components/bar-visualizer) | Frequency-band bars with idle, loading and mirrored modes |
| [Electric Bar Visualizer](https://audiocn-solid.jhonra121.workers.dev/docs/components/electric-bar-visualizer) | Crackling frequency bars with arcs and sparks |
| [Electric Waveform](https://audiocn-solid.jhonra121.workers.dev/docs/components/electric-waveform) | Glowing waveform with a bright core, forks and sparks |
| [Smooth Waveform](https://audiocn-solid.jhonra121.workers.dev/docs/components/smooth-waveform) | Flowing waveform or oscilloscope trace |
| [Live Waveform](https://audiocn-solid.jhonra121.workers.dev/docs/components/live-waveform) | Canvas waveform of a live signal |
| [Waveform](https://audiocn-solid.jhonra121.workers.dev/docs/components/waveform) | Clip waveform with playhead, seeking, regions and markers |
| [Spectrum](https://audiocn-solid.jhonra121.workers.dev/docs/components/spectrum) | Frequency analyser with axes, grid and peak hold |

**Controls**

| Component | What it does |
| --- | --- |
| [Fader](https://audiocn-solid.jhonra121.workers.dev/docs/components/fader) | Decibel volume fader with tapers, detents, scale and reset |
| [Parameter Slider](https://audiocn-solid.jhonra121.workers.dev/docs/components/parameter-slider) | Labelled slider with numeric input, unit, marks and reset |
| [Knob](https://audiocn-solid.jhonra121.workers.dev/docs/components/knob) | Rotary control for dense layouts |
| [LCD Display](https://audiocn-solid.jhonra121.workers.dev/docs/components/lcd-display) | Themeable dot-matrix screen with dropdown rows |
| [Pan Control](https://audiocn-solid.jhonra121.workers.dev/docs/components/pan-control) | Left-right balance with centre detent |
| [Channel Toggle](https://audiocn-solid.jhonra121.workers.dev/docs/components/channel-toggle) | Mute, solo and monitor buttons |
| [Volume Control](https://audiocn-solid.jhonra121.workers.dev/docs/components/volume-control) | Volume slider with mute button |
| [Audio Device Select](https://audiocn-solid.jhonra121.workers.dev/docs/components/audio-device-select) | Microphone, speaker or source picker |

**Mixer**

| Component | What it does |
| --- | --- |
| [Channel Strip](https://audiocn-solid.jhonra121.workers.dev/docs/components/channel-strip) | Mixer channel composed from the parts you need |
| [Mixer](https://audiocn-solid.jhonra121.workers.dev/docs/components/mixer) | Channel strips with shared meter settings and keyboard navigation |

**Sounds and music**

| Component | What it does |
| --- | --- |
| [Audio Player](https://audiocn-solid.jhonra121.workers.dev/docs/components/audio-player) | Composable player with transport, seeking, volume, rate and loop |
| [Track List](https://audiocn-solid.jhonra121.workers.dev/docs/components/track-list) | Tracks with active and playing states and arrow-key navigation |
| [Sound Pad](https://audiocn-solid.jhonra121.workers.dev/docs/components/sound-pad) | Trigger pad with modes, hotkey and playback progress |

</details>

## Blocks

Blocks combine components into complete audio features.

<table>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/system-audio-mixer"><img src="site/public/og/blocks-system-audio-mixer-d74e5e2f8a52.png" alt="System Audio Mixer: microphone, system audio, music, sound pads and master controls." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/music-player"><img src="site/public/og/blocks-music-player-200b8dbbecc7.png" alt="Music Player: playlist, waveform seek bar, shuffle, repeat and ducking." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/soundboard"><img src="site/public/og/blocks-soundboard-1acd117f32b4.png" alt="Soundboard: sound pads with hotkeys, modes, volume and drag-and-drop." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/mic-setup"><img src="site/public/og/blocks-mic-setup-d9c2769ce50f.png" alt="Microphone Setup: device selector, live preview, meter and gain." /></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/quick-audio-popover"><img src="site/public/og/blocks-quick-audio-popover-b7e4032b961f.png" alt="Quick Audio Popover: microphone and system audio controls." /></a></td>
    <td width="50%"><a href="https://audiocn-solid.jhonra121.workers.dev/docs/blocks/system-audio-settings"><img src="site/public/og/blocks-system-audio-settings-a5dbdd89433a.png" alt="System Audio Settings: capture, volume and a meter." /></a></td>
  </tr>
</table>

## Hooks

Web Audio hooks provide levels and playback state to components. You can also provide data from another audio engine.

| Hook | What it does |
| --- | --- |
| [`useMicrophone`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-microphone) | Open a microphone as a `MediaStream` |
| [`useSystemAudio`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-system-audio) | Capture system or tab audio through the browser's share picker |
| [`useAudioAnalyser`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-audio-analyser) | Meter and visualize streams, media elements or `AudioNode`s |
| [`useWebAudioMixer`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-web-audio-mixer) | Bind mixer state to a Web Audio graph |
| [`useMixer`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-mixer) | Gain, mute, solo, pan and monitor state |
| [`useAudioPlayer`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-audio-player) | Playback state for an owned audio element |
| [`useSound`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-sound) | Low-latency playback of short decoded sounds |
| [`useWaveformData`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-waveform-data) | Decode an audio file into cached waveform peaks |
| [`useAudioDevices`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-audio-devices) | Audio devices with permission state and live updates |
| [`useDemoSignal`](https://audiocn-solid.jhonra121.workers.dev/docs/hooks/use-demo-signal) | Synthetic signals for previews, prototypes and tests |

Plus `useAudioContext`, `useAudioConfig`, `useFrameSource`, `useLevel`, `useClipHold`, `useGainNode`, `useVisibility` and `useReducedMotion`.

## Quick start

audiocn Solid is a [shadcn registry](https://ui.shadcn.com/docs/registry). Start with Solid 1.9.15 or later in the 1.x line, Tailwind CSS v4 and a `components.json`. Use the [installation guide](https://audiocn-solid.jhonra121.workers.dev/docs/installation) for setup; the React-oriented shadcn initializer is not the right bootstrap.

**1. Add the registry** for your Solid runtime to `components.json`:

```json
{
  "registries": {
    "@audiocn-solid": "https://audiocn-solid.jhonra121.workers.dev/r/solid1/{name}.json"
  }
}
```

For the experimental Solid 2 registry, use `/r/solid2/{name}.json`. It targets `solid-js` and `@solidjs/web` 2.0.0-rc.14.

**2. Add components.** The CLI copies each component with its audio core, compatibility helpers, theme tokens and hooks.

```bash
bunx --bun shadcn@4.21.0 add @audiocn-solid/level-meter
bunx --bun shadcn@4.21.0 add @audiocn-solid/system-audio-mixer
```

**3. Use them.**

```tsx
import { LevelMeter } from "@/components/ui/level-meter";

export const MicLevel = (props: { peakDb: number }) => (
  <LevelMeter aria-label="Microphone level" peakDb={props.peakDb} />
);
```

The component API is shared between Solid 1 and Solid 2. The Solid 1 registry is stable. The Solid 2 registry is experimental and uses prerelease dependencies. The two registries use different JSX transforms, so configure the matching runtime before adding components. See the [installation guide](https://audiocn-solid.jhonra121.workers.dev/docs/installation) for setup details.

## Develop

This repository contains the Solid component source, two source registries and a static Solid 2 documentation site.

| Path | What it is |
| --- | --- |
| `components/ui/` | Public components |
| `components/blocks/` | Composed audio features |
| `hooks/` | Solid and Web Audio integrations |
| `lib/audio/` | Framework-neutral audio core |
| `components/examples/` | Gallery examples |
| `site/content/docs/` | Documentation pages |
| `site/public/r/solid1/` and `site/public/r/solid2/` | Generated runtime registries |

```bash
bun install --frozen-lockfile
bun run dev                         # Solid 1 preview
bun run --cwd site dev              # documentation site
bun run check                       # root typecheck and build
bunx playwright install chromium webkit
bun run test:e2e                    # Solid 1 browser acceptance
```

The root preview is for acceptance testing; library code does not depend on it. See [DEVELOPMENT.md](./DEVELOPMENT.md) for Solid 2 testing in a separate checkout, registry checks and deployment instructions.

## License

[MIT](./license.md). Portions are adapted from [audiocn/ui](https://github.com/audiocn/ui). The Warcraft audio clip used in the documentation is site-only, is not covered by the MIT license and is not installed with registry items.
