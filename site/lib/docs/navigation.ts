export interface DocsNavItem {
  href: string;
  label: string;
}

export interface DocsNavGroup {
  items: readonly DocsNavItem[];
  label?: string;
}

export interface DocsNavArea {
  groups: readonly DocsNavGroup[];
  label: string;
}

export const DOCS_NAVIGATION: readonly DocsNavArea[] = [
  {
    label: "Getting started",
    groups: [
      {
        items: [
          { href: "/docs", label: "Introduction" },
          { href: "/docs/installation", label: "Installation" },
        ],
      },
    ],
  },
  {
    label: "Concepts",
    groups: [
      {
        items: [
          { href: "/docs/concepts/decibels", label: "Decibels and levels" },
          { href: "/docs/concepts/feeding-data", label: "Feeding data" },
          { href: "/docs/concepts/theming", label: "Theming" },
          { href: "/docs/concepts/accessibility", label: "Accessibility" },
          {
            href: "/docs/concepts/custom-engine",
            label: "Using your own audio engine",
          },
        ],
      },
    ],
  },
  {
    label: "Components",
    groups: [
      {
        items: [{ href: "/docs/components", label: "Components" }],
      },
      {
        label: "Meters and visualizers",
        items: [
          { href: "/docs/components/level-meter", label: "Level Meter" },
          { href: "/docs/components/db-scale", label: "dB Scale" },
          { href: "/docs/components/db-readout", label: "dB Readout" },
          { href: "/docs/components/clip-indicator", label: "Clip Indicator" },
          { href: "/docs/components/bar-visualizer", label: "Bar Visualizer" },
          {
            href: "/docs/components/electric-bar-visualizer",
            label: "Electric Bar Visualizer",
          },
          {
            href: "/docs/components/electric-waveform",
            label: "Electric Waveform",
          },
          {
            href: "/docs/components/smooth-waveform",
            label: "Smooth Waveform",
          },
          { href: "/docs/components/live-waveform", label: "Live Waveform" },
          { href: "/docs/components/waveform", label: "Waveform" },
          { href: "/docs/components/spectrum", label: "Spectrum" },
        ],
      },
      {
        label: "Controls",
        items: [
          { href: "/docs/components/fader", label: "Fader" },
          {
            href: "/docs/components/parameter-slider",
            label: "Parameter Slider",
          },
          { href: "/docs/components/knob", label: "Knob" },
          { href: "/docs/components/pan-control", label: "Pan Control" },
          {
            href: "/docs/components/channel-toggle",
            label: "Channel Toggle",
          },
          {
            href: "/docs/components/volume-control",
            label: "Volume Control",
          },
          {
            href: "/docs/components/audio-device-select",
            label: "Audio Device Select",
          },
        ],
      },
      {
        label: "Mixer",
        items: [
          { href: "/docs/components/channel-strip", label: "Channel Strip" },
          { href: "/docs/components/mixer", label: "Mixer" },
        ],
      },
      {
        label: "Sounds and music",
        items: [
          { href: "/docs/components/audio-player", label: "Audio Player" },
          { href: "/docs/components/track-list", label: "Track List" },
          { href: "/docs/components/sound-pad", label: "Sound Pad" },
        ],
      },
    ],
  },
  {
    label: "Hooks",
    groups: [
      {
        items: [
          { href: "/docs/hooks/use-demo-signal", label: "useDemoSignal" },
          { href: "/docs/hooks/use-frame-source", label: "useFrameSource" },
          { href: "/docs/hooks/use-level", label: "useLevel" },
          { href: "/docs/hooks/use-clip-hold", label: "useClipHold" },
          {
            href: "/docs/hooks/use-reduced-motion",
            label: "useReducedMotion",
          },
          { href: "/docs/hooks/use-visibility", label: "useVisibility" },
          {
            href: "/docs/hooks/use-audio-context",
            label: "useAudioContext",
          },
          { href: "/docs/hooks/use-gain-node", label: "useGainNode" },
          {
            href: "/docs/hooks/use-audio-analyser",
            label: "useAudioAnalyser",
          },
          {
            href: "/docs/hooks/use-audio-devices",
            label: "useAudioDevices",
          },
          { href: "/docs/hooks/use-microphone", label: "useMicrophone" },
          {
            href: "/docs/hooks/use-system-audio",
            label: "useSystemAudio",
          },
          { href: "/docs/hooks/use-mixer", label: "useMixer" },
          {
            href: "/docs/hooks/use-web-audio-mixer",
            label: "useWebAudioMixer",
          },
          {
            href: "/docs/hooks/use-audio-player",
            label: "useAudioPlayer",
          },
          { href: "/docs/hooks/use-sound", label: "useSound" },
          {
            href: "/docs/hooks/use-waveform-data",
            label: "useWaveformData",
          },
        ],
      },
    ],
  },
  {
    label: "Blocks",
    groups: [
      {
        items: [
          { href: "/docs/blocks", label: "Blocks" },
          {
            href: "/docs/blocks/system-audio-mixer",
            label: "System Audio Mixer",
          },
          { href: "/docs/blocks/mic-setup", label: "Microphone Setup" },
          {
            href: "/docs/blocks/system-audio-settings",
            label: "System Audio Settings",
          },
          {
            href: "/docs/blocks/quick-audio-popover",
            label: "Quick Audio Popover",
          },
          { href: "/docs/blocks/soundboard", label: "Soundboard" },
          { href: "/docs/blocks/music-player", label: "Music Player" },
        ],
      },
    ],
  },
] as const;
