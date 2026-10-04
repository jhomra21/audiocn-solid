export interface DocsPageMetadata {
  description: string;
  title: string;
}

export const DOCS_PAGE_METADATA = {
  "/docs/components/db-scale": {
    title: "dB Scale",
    description:
      "Tick marks and labels for a decibel range, shared by meters and faders.",
  },
  "/docs/components/db-readout": {
    title: "dB Readout",
    description:
      "A numeric level label that updates at a readable rate and never shifts the layout.",
  },
  "/docs/components/clip-indicator": {
    title: "Clip Indicator",
    description:
      "A clip light that holds after the signal clips, with an optional count and click to reset.",
  },
  "/docs/components/fader": {
    title: "Fader",
    description:
      "A volume fader in decibels, with tapers, detents, a scale, reset and an editable value.",
  },
  "/docs/components/parameter-slider": {
    title: "Parameter Slider",
    description:
      "A labelled slider with a numeric input, unit, marks and reset, for everything that is not a volume.",
  },
  "/docs/components/knob": {
    title: "Knob",
    description: "A rotary control for dense layouts, drawn in SVG.",
  },
  "/docs/components/pan-control": {
    title: "Pan Control",
    description:
      "Left and right balance with a fill from the centre and a centre detent.",
  },
  "/docs/components/channel-toggle": {
    title: "Channel Toggle",
    description:
      "Mute, solo and monitor toggle buttons with their own pressed colours.",
  },
  "/docs/components/volume-control": {
    title: "Volume Control",
    description: "A simple volume slider with a mute button, for players.",
  },
  "/docs/components/channel-strip": {
    title: "Channel Strip",
    description:
      "One channel of a mixer, as a row or a console strip, composed from the parts you need.",
  },
  "/docs/components/mixer": {
    title: "Mixer",
    description:
      "The container for channel strips, with shared meter settings and keyboard navigation.",
  },
  "/docs/hooks/use-demo-signal": {
    title: "useDemoSignal",
    description:
      "A synthetic speech, music, tone or noise signal as frame sources, for previews, prototypes and tests.",
  },
  "/docs/hooks/use-frame-source": {
    title: "useFrameSource",
    description:
      "Subscribe a callback to a frame source, with a stable callback and automatic cleanup.",
  },
  "/docs/hooks/use-clip-hold": {
    title: "useClipHold",
    description: "Clip detection with a hold time, a clip count and a reset.",
  },
  "/docs/hooks/use-reduced-motion": {
    title: "useReducedMotion",
    description: "True when the user asked the system to reduce motion.",
  },
  "/docs/hooks/use-visibility": {
    title: "useVisibility",
    description:
      "Whether an element is on screen, in a ref, so animation loops can skip frames nobody sees.",
  },
  "/docs/hooks/use-audio-context": {
    title: "useAudioContext",
    description:
      "One shared AudioContext that resumes on the first user gesture, plus a provider to supply your own.",
  },
  "/docs/hooks/use-gain-node": {
    title: "useGainNode",
    description:
      "A gain node on the shared AudioContext, wired from an input to a destination, with click-free level changes.",
  },
  "/docs/hooks/use-audio-analyser": {
    title: "useAudioAnalyser",
    description:
      "Meter and visual frame sources from a MediaStream, media element or AudioNode.",
  },
  "/docs/hooks/use-audio-devices": {
    title: "useAudioDevices",
    description:
      "The list of audio input or output devices, with permission state and live updates.",
  },
  "/docs/hooks/use-microphone": {
    title: "useMicrophone",
    description:
      "Open a microphone as a MediaStream, with browser processing off by default.",
  },
  "/docs/hooks/use-system-audio": {
    title: "useSystemAudio",
    description:
      "Capture system or tab audio through the browser's screen-share picker.",
  },
  "/docs/hooks/use-mixer": {
    title: "useMixer",
    description:
      "Mixer state with no audio attached: gain, mute, solo, pan and monitor per channel, plus a master.",
  },
  "/docs/hooks/use-web-audio-mixer": {
    title: "useWebAudioMixer",
    description:
      "Binds mixer state to a Web Audio graph, with ducking, monitor sends, a limited master and meters.",
  },
  "/docs/hooks/use-audio-player": {
    title: "useAudioPlayer",
    description: "Playback state for an audio element the hook owns.",
  },
  "/docs/hooks/use-sound": {
    title: "useSound",
    description: "Low-latency playback of short sounds decoded into memory.",
  },
  "/docs/hooks/use-waveform-data": {
    title: "useWaveformData",
    description: "Decode an audio file and reduce it to cached waveform peaks.",
  },
  "/docs/components/bar-visualizer": {
    title: "Bar Visualizer",
    description:
      "A row of bars driven by frequency bands, with idle, loading and mirrored modes.",
  },
  "/docs/components/electric-bar-visualizer": {
    title: "Electric Bar Visualizer",
    description:
      "Frequency-band bars drawn as crackling filaments, with arcs between loud neighbours and sparks on sudden rises.",
  },
  "/docs/components/electric-waveform": {
    title: "Electric Waveform",
    description:
      "One electric line across the width, with a crackling white-hot core, a tall glow, forks off the peaks and sparks.",
  },
  "/docs/components/smooth-waveform": {
    title: "Smooth Waveform",
    description:
      "One clean line across the width that follows the sound, as a flowing wave or an oscilloscope trace.",
  },
  "/docs/components/live-waveform": {
    title: "Live Waveform",
    description:
      "A canvas waveform of a live signal, as scrolling history or the current frame.",
  },
  "/docs/components/waveform": {
    title: "Waveform",
    description:
      "A static waveform of a clip with a smooth playhead, seeking, hover time, regions and markers.",
  },
  "/docs/components/spectrum": {
    title: "Spectrum",
    description:
      "A frequency spectrum analyser with axes, a grid and peak hold.",
  },
  "/docs/components/audio-device-select": {
    title: "Audio Device Select",
    description:
      "A microphone, speaker or source picker with permission, loading and disconnected states.",
  },
  "/docs/components/audio-player": {
    title: "Audio Player",
    description:
      "A composable audio player with transport, seeking, time, volume, rate, loop and keyboard shortcuts.",
  },
  "/docs/components/track-list": {
    title: "Track List",
    description:
      "A list of tracks with active and playing states and arrow-key navigation.",
  },
  "/docs/components/sound-pad": {
    title: "Sound Pad",
    description:
      "A trigger pad with modes, a hotkey, playback progress and an accent colour.",
  },
  "/docs/blocks/system-audio-mixer": {
    title: "System Audio Mixer",
    description:
      "The complete mixer, with microphone, system audio, music, sound pads and a master, running on Web Audio.",
  },
  "/docs/blocks/mic-setup": {
    title: "Microphone Setup",
    description:
      "Choose and check a microphone, with a live preview, a meter, gain, mute and a level check.",
  },
  "/docs/blocks/system-audio-settings": {
    title: "System Audio Settings",
    description:
      "Turn system audio capture on, set its level and see what the browser captures.",
  },
  "/docs/blocks/quick-audio-popover": {
    title: "Quick Audio Popover",
    description:
      "Microphone and system audio controls behind one toolbar button that shows a live level.",
  },
  "/docs/blocks/soundboard": {
    title: "Soundboard",
    description:
      "Sound pads with hotkeys, modes, volume, stop all and drag-and-drop.",
  },
  "/docs/blocks/music-player": {
    title: "Music Player",
    description:
      "A playlist player with a waveform seek bar, shuffle, repeat and ducking under the microphone.",
  },
} satisfies Record<string, DocsPageMetadata>;
