import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { StageOver, StageUnder } from "./components/Backdrop";
import { Close, Reveal } from "./scenes/Brand";
import { Beyond, BuiltWith, Impact, Safety, Speed } from "./scenes/Closing";
import { HowItWorks } from "./scenes/HowItWorks";
import { ColdOpen, Moment } from "./scenes/Opening";
import { TodayForm, TodayGap } from "./scenes/Today";
import { EASE_IN_OUT, FONT_SANS, color } from "./theme";
import { SCENE_ORDER, SCENES, SceneKey, TOTAL_FRAMES, TRANSITION_FRAMES } from "./timeline";

export type PitchProps = {
  /** Optional file in video/public, e.g. "music.mp3". Rendered silent when null. */
  musicSrc: string | null;
  /** Optional voiceover file in video/public. */
  voiceoverSrc: string | null;
};

const SCENE_COMPONENTS: Record<SceneKey, React.FC> = {
  coldOpen: ColdOpen,
  moment: Moment,
  todayForm: TodayForm,
  todayGap: TodayGap,
  reveal: Reveal,
  how: HowItWorks,
  speed: Speed,
  impact: Impact,
  safety: Safety,
  beyond: Beyond,
  builtWith: BuiltWith,
  close: Close,
};

const sceneTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES, easing: EASE_IN_OUT });
const sceneFade = fade({ shouldFadeOutExitingScene: true });

/** Music bed volume: 2 s fade in, 3 s fade out, sits under a voiceover at 0.35. */
const musicVolume = (frame: number, ducked: boolean): number => {
  const peak = ducked ? 0.35 : 0.8;
  return interpolate(frame, [0, 60, TOTAL_FRAMES - 90, TOTAL_FRAMES], [0, peak, peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** The full FirstMinute pitch film. */
export const Pitch: React.FC<PitchProps> = ({ musicSrc, voiceoverSrc }) => (
  <AbsoluteFill style={{ fontFamily: FONT_SANS, color: color.text, backgroundColor: color.bg }}>
    <StageUnder />
    <TransitionSeries>
      {SCENE_ORDER.flatMap((key, index) => {
        const Scene = SCENE_COMPONENTS[key];
        const sequence = (
          <TransitionSeries.Sequence key={key} durationInFrames={SCENES[key]}>
            <Scene />
          </TransitionSeries.Sequence>
        );
        if (index === SCENE_ORDER.length - 1) {
          return [sequence];
        }
        return [
          sequence,
          <TransitionSeries.Transition
            key={`${key}-transition`}
            presentation={sceneFade}
            timing={sceneTiming}
          />,
        ];
      })}
    </TransitionSeries>
    <StageOver />
    {musicSrc ? (
      <Audio src={staticFile(musicSrc)} volume={(frame) => musicVolume(frame, voiceoverSrc !== null)} />
    ) : null}
    {voiceoverSrc ? <Audio src={staticFile(voiceoverSrc)} /> : null}
  </AbsoluteFill>
);
