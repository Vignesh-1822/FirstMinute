/**
 * Scene durations in frames (30 fps). Transitions overlap neighbouring scenes
 * by TRANSITION_FRAMES, so the film is shorter than the plain sum.
 */
export const TRANSITION_FRAMES = 20;

export const HOW_STEPS = {
  talk: 255,
  score: 285,
  ask: 285,
  route: 300,
  alert: 270,
} as const;

const howTotal =
  Object.values(HOW_STEPS).reduce((sum, frames) => sum + frames, 0) -
  (Object.keys(HOW_STEPS).length - 1) * TRANSITION_FRAMES;

export const SCENES = {
  coldOpen: 210,
  moment: 300,
  todayForm: 315,
  todayGap: 300,
  reveal: 210,
  how: howTotal,
  speed: 225,
  impact: 195,
  safety: 210,
  beyond: 210,
  builtWith: 165,
  close: 195,
} as const;

export type SceneKey = keyof typeof SCENES;

export const SCENE_ORDER: SceneKey[] = [
  "coldOpen",
  "moment",
  "todayForm",
  "todayGap",
  "reveal",
  "how",
  "speed",
  "impact",
  "safety",
  "beyond",
  "builtWith",
  "close",
];

export const TOTAL_FRAMES =
  SCENE_ORDER.reduce((sum, key) => sum + SCENES[key], 0) -
  (SCENE_ORDER.length - 1) * TRANSITION_FRAMES;

/** Absolute start frame of each scene in the final film (useful for stills). */
export const sceneStart = (key: SceneKey): number => {
  let start = 0;
  for (const current of SCENE_ORDER) {
    if (current === key) {
      return start;
    }
    start += SCENES[current] - TRANSITION_FRAMES;
  }
  return start;
};
