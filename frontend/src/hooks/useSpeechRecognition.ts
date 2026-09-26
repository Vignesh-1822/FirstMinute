import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechState } from "@/types";

interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
}

function getConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

const ERROR_COPY: Record<string, string> = {
  "not-allowed": "Microphone permission was denied.",
  "service-not-allowed": "Speech service is blocked in this browser.",
  "no-speech": "No speech detected. Try again closer to the mic.",
  "audio-capture": "No microphone found.",
  network: "Speech service unreachable (network).",
};

/**
 * Web Speech API wrapper. Interim results stream into the same transcript
 * pipeline as scenario playback. Degrades to `support: "unsupported"`.
 */
export function useSpeechRecognition(callbacks: SpeechCallbacks) {
  const [state, setState] = useState<SpeechState>(() => ({
    support: getConstructor() ? "supported" : "unsupported",
    listening: false,
    error: null,
  }));
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getConstructor();
    if (!Recognition) {
      setState((previous) => ({ ...previous, support: "unsupported" }));
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState((previous) => ({ ...previous, listening: true, error: null }));
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) callbacksRef.current.onFinal(text.trim());
        else interim += text;
      }
      callbacksRef.current.onInterim(interim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      setState((previous) => ({ ...previous, error: ERROR_COPY[event.error] ?? `Speech error: ${event.error}` }));
    };
    recognition.onend = () => {
      setState((previous) => ({ ...previous, listening: false }));
      recognitionRef.current = null;
      callbacksRef.current.onEnd();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setState((previous) => ({ ...previous, error: "Could not start the microphone." }));
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { ...state, start, stop };
}
