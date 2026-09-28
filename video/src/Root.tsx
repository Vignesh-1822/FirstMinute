import React from "react";
import { Composition } from "remotion";
import { Pitch, PitchProps } from "./Pitch";
import { Poster } from "./Poster";
import { BrandCard } from "./BrandCard";
import { ConsoleCard } from "./ConsoleCard";
import { Banner } from "./Banner";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

/** The poster animates in over these frames; the last frame is exported as poster.png. */
const POSTER_FRAMES = 180;

const defaultPitchProps: PitchProps = { musicSrc: "music.mp3", voiceoverSrc: null };

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
    <Composition
      id="FirstMinuteBrandCard"
      component={BrandCard}
      durationInFrames={POSTER_FRAMES}
      fps={FPS}
      width={1080}
      height={1350}
    />
    <Composition
      id="FirstMinuteConsoleCard"
      component={ConsoleCard}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1350}
    />
    <Composition
      id="FirstMinuteBanner"
      component={Banner}
      durationInFrames={POSTER_FRAMES}
      fps={FPS}
      width={1600}
      height={640}
    />
  </>
);
