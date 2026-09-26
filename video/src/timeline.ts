/**
 * Scene durations in frames (30 fps). The numbers live in timeline.json so the
 * music generator (scripts/compose-music.py) scores the exact same cut.
 * Transitions overlap neighbouring scenes by TRANSITION_FRAMES.
 */
import timeline from "./timeline.json";

export const TRANSITION_FRAMES: number = timeline.transitionFrames;

export const HOW_STEPS = timeline.howSteps;

const howTotal =
  Object.values(HOW_STEPS).reduce((sum, frames) => sum + frames, 0) -
  (Object.keys(HOW_STEPS).length - 1) * TRANSITION_FRAMES;

export const SCENES = { ...timeline.scenes, how: howTotal };

export type SceneKey = keyof typeof SCENES;

export const SCENE_ORDER = timeline.order as SceneKey[];

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
