// Catalog of render options exposed in the UI. Mirrors the demo-pipeline CLI
// (github.com/philipposk/demo-pipeline) so the platform and the local tool agree.

export type Service = "video" | "screenshots";

export const SERVICES: { id: Service; label: string; blurb: string }[] = [
  { id: "video", label: "Demo video", blurb: "A narrated click-through video of your live site." },
  { id: "screenshots", label: "Screenshot grid", blurb: "A clickable grid of screenshots for your README." },
];

export const MODES = [
  { id: "zoom", label: "Cinematic (landscape)", blurb: "Zoom-to-click, cursor, cards, logo." },
  { id: "short", label: "Short (vertical 9:16)", blurb: "TikTok/Reels cut, big captions, punchy." },
  { id: "simple", label: "Simple", blurb: "Plain screen recording + narration." },
] as const;

export const FORMATS = [
  { id: "landscape", label: "16:9 Landscape" },
  { id: "portrait", label: "9:16 Portrait" },
  { id: "square", label: "1:1 Square" },
  { id: "4:5", label: "4:5 Feed" },
] as const;

export const VOICES = [
  { id: "edge", label: "Neural (free)", blurb: "Microsoft neural voice. Free, very natural." },
  { id: "openai", label: "OpenAI (premium)", blurb: "gpt-4o-mini-tts. ~2¢. Steerable tone." },
  { id: "kokoro", label: "Local (free)", blurb: "Offline open model." },
  { id: "elevenlabs", label: "ElevenLabs (best)", blurb: "Most realistic. ~12¢." },
] as const;

export const SUBTITLES = [
  { id: "burn", label: "Burned in" },
  { id: "sidecar", label: "Separate .srt" },
  { id: "off", label: "None" },
] as const;

export const PRESETS = [
  { id: "full", label: "All features" },
  { id: "highlights", label: "Highlights" },
  { id: "basic", label: "Core only" },
] as const;

export type RenderOptions = {
  url: string;
  service: Service;
  mode: (typeof MODES)[number]["id"];
  format: (typeof FORMATS)[number]["id"];
  voice: (typeof VOICES)[number]["id"];
  subtitles: (typeof SUBTITLES)[number]["id"];
  preset: (typeof PRESETS)[number]["id"];
};

export const DEFAULT_OPTIONS: RenderOptions = {
  url: "",
  service: "video",
  mode: "zoom",
  format: "landscape",
  voice: "edge",
  subtitles: "sidecar",
  preset: "full",
};
