import React from "react";
import { Composition } from "remotion";
import { Pitch, PitchProps } from "./Pitch";
import { Poster } from "./Poster";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

/** The poster animates in over these frames; the last frame is exported as poster.png. */
const POSTER_FRAMES = 180;

const defaultPitchProps: PitchProps = { musicSrc: null, voiceoverSrc: null };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="FirstMinutePitch"
      component={Pitch}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultPitchProps}
    />
    <Composition
      id="FirstMinutePoster"
      component={Poster}
      durationInFrames={POSTER_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
