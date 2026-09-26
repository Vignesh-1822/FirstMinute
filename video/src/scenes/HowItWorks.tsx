import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { StepRail } from "../components/StepLayout";
import { progress } from "../lib/anim";
import { HOW_STEPS, TRANSITION_FRAMES } from "../timeline";
import { EASE_IN_OUT } from "../theme";
import { HowAlert } from "./HowAlert";
import { HowRoute } from "./HowRoute";
import { HowAsk, HowScore } from "./HowScore";
import { HowTalk } from "./HowTalk";

const stepTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES, easing: EASE_IN_OUT });
const stepFade = fade({ shouldFadeOutExitingScene: true });

const STEP_DURATIONS = [HOW_STEPS.talk, HOW_STEPS.score, HOW_STEPS.ask, HOW_STEPS.route, HOW_STEPS.alert];

/** Index of the step on screen, switching at the midpoint of each cross-fade. */
const activeStep = (frame: number): number => {
  let boundary = 0;
  for (let index = 0; index < STEP_DURATIONS.length - 1; index++) {
    boundary += STEP_DURATIONS[index] - TRANSITION_FRAMES;
    if (frame < boundary + TRANSITION_FRAMES / 2) {
      return index;
    }
  }
  return STEP_DURATIONS.length - 1;
};

/** 6. How it works: five steps, one at a time, with a steady progress rail. */
export const HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const railIn = progress(frame, 12, 24);
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={HOW_STEPS.talk}>
          <HowTalk />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={stepFade} timing={stepTiming} />
        <TransitionSeries.Sequence durationInFrames={HOW_STEPS.score}>
          <HowScore />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={stepFade} timing={stepTiming} />
        <TransitionSeries.Sequence durationInFrames={HOW_STEPS.ask}>
          <HowAsk />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={stepFade} timing={stepTiming} />
        <TransitionSeries.Sequence durationInFrames={HOW_STEPS.route}>
          <HowRoute />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={stepFade} timing={stepTiming} />
        <TransitionSeries.Sequence durationInFrames={HOW_STEPS.alert}>
          <HowAlert />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <div style={{ position: "absolute", left: 140, bottom: 96, opacity: railIn }}>
        <StepRail active={activeStep(frame)} />
      </div>
    </AbsoluteFill>
  );
};
