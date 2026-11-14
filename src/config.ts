// All tuning and layout values live here.

export const GAME = {
  width: 960,
  height: 540,
  background: '#14131f',
} as const;

export const COLORS = {
  text: '#f2e9d8',
  textMuted: '#a79f8f',
  region: 0x2b2940,
  regionHover: 0x3a3756,
  regionStroke: 0x8a7a55,
  marker: 0xe8c872,
  debugBackground: 0x000000,
} as const;

export const FONTS = {
  ui: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, monospace',
} as const;

/** KeyboardEvent.code values for each action. A code may belong to only one action. */
export const INPUT_BINDINGS = {
  interact: ['Enter', 'Space'],
  back: ['Escape'],
  move_left: ['ArrowLeft', 'KeyA'],
  move_right: ['ArrowRight', 'KeyD'],
  move_up: ['ArrowUp', 'KeyW'],
  move_down: ['ArrowDown', 'KeyS'],
  toggle_debug: ['Backquote'],
} as const;

export interface MapRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Placeholder layout for the map hub, roughly west to east. */
export const MAP_REGIONS: readonly MapRegion[] = [
  { id: 'egypt', name: 'Egypt', x: 120, y: 300, width: 200, height: 150 },
  { id: 'madyan', name: 'Madyan', x: 360, y: 330, width: 150, height: 110 },
  { id: 'canaan', name: 'Canaan', x: 360, y: 160, width: 150, height: 120 },
  { id: 'arabia', name: 'Arabia', x: 550, y: 330, width: 230, height: 150 },
  { id: 'mesopotamia', name: 'Mesopotamia', x: 560, y: 120, width: 240, height: 140 },
];

export interface ChapterMarker {
  chapterId: string;
  label: string;
  regionId: string;
  playable: boolean;
}

// Surah Yusuf names Misr (Egypt) in 12:21, and most of the surah takes place there.
export const CHAPTER_MARKERS: readonly ChapterMarker[] = [
  { chapterId: 'yusuf', label: 'Yusuf (as)', regionId: 'egypt', playable: false },
];
