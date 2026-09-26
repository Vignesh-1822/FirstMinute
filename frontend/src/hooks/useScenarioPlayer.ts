import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@/types";

interface PlayerCallbacks {
  onProgress: (text: string) => void;
  onDone: (text: string) => void;
}

export const WORDS_PER_SECOND = 3.2;

/**
 * Streams a transcript word by word (~3.2 words/s at 1×) to simulate a medic
 * speaking. Supports pause / resume / skip-to-end and a speed multiplier.
 */
export function useScenarioPlayer(callbacks: PlayerCallbacks) {
  const [state, setState] = useState<PlaybackState>("idle");
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const wordsRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(speed);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const activeRef = useRef(false);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimer();
    const text = wordsRef.current.join(" ");
    indexRef.current = wordsRef.current.length;
    setProgress(1);
    setState("done");
    callbacksRef.current.onDone(text);
  }, []);

  const tick = useCallback(() => {
    indexRef.current += 1;
    const words = wordsRef.current;
    const text = words.slice(0, indexRef.current).join(" ");
    setProgress(indexRef.current / Math.max(1, words.length));
    if (indexRef.current >= words.length) {
      finish();
      return;
    }
    callbacksRef.current.onProgress(text);
    const lastWord = words[indexRef.current - 1] ?? "";
    // Natural cadence: a beat longer after sentence ends and commas.
    const pause = /[.?!]$/.test(lastWord) ? 2.2 : /,$/.test(lastWord) ? 1.4 : 1;
    timerRef.current = setTimeout(tick, (1000 / (WORDS_PER_SECOND * speedRef.current)) * pause);
  }, [finish]);

  const play = useCallback(
    (transcript: string) => {
      clearTimer();
      wordsRef.current = transcript.split(/\s+/).filter(Boolean);
      indexRef.current = 0;
      activeRef.current = true;
      setProgress(0);
      setState("playing");
      timerRef.current = setTimeout(tick, 350);
    },
    [tick],
  );

  const pause = useCallback(() => {
    clearTimer();
    setState((previous) => (previous === "playing" ? "paused" : previous));
  }, []);

  const resume = useCallback(() => {
    if (!activeRef.current) return;
    setState("playing");
    timerRef.current = setTimeout(tick, 120);
  }, [tick]);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    wordsRef.current = [];
    indexRef.current = 0;
    setProgress(0);
    setState("idle");
  }, []);

  useEffect(() => clearTimer, []);

  return { state, progress, speed, setSpeed, play, pause, resume, skip: finish, stop };
}
