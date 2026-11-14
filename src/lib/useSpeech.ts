"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

// Minimale Typen für die Web Speech API (Chrome: webkitSpeechRecognition)
type Alternative = { transcript: string };
type Result = { isFinal: boolean; 0: Alternative; length: number };
type ResultEvent = { resultIndex: number; results: { length: number; [i: number]: Result } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: ResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function erzeuge(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Spracheingabe auf Deutsch. Startet nach Pausen automatisch neu, solange "aktiv" ist. */
export function useSpeech() {
  // Ob der Browser Spracherkennung kann (auf dem Server: optimistisch true, kein Hydration-Mismatch)
  const browserKann = useSyncExternalStore(
    noop,
    () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    () => true,
  );
  const [startFehlgeschlagen, setStartFehlgeschlagen] = useState(false);
  const unterstuetzt = browserKann && !startFehlgeschlagen;
  const [aktiv, setAktiv] = useState(false);
  const [text, setText] = useState("");
  const [zwischen, setZwischen] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const willAktiv = useRef(false);

  useEffect(() => {
    return () => {
      willAktiv.current = false;
      recRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const rec = erzeuge();
    if (!rec) {
      setStartFehlgeschlagen(true);
      return;
    }
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let fertig = "";
      let vorlaeufig = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fertig += r[0].transcript;
        else vorlaeufig += r[0].transcript;
      }
      if (fertig) setText((t) => (t ? t.trimEnd() + " " : "") + fertig.trim());
      setZwischen(vorlaeufig);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setFehler(e.error === "not-allowed" ? "Mikrofon nicht erlaubt. Bitte im Browser freigeben." : `Spracherkennung: ${e.error}`);
      willAktiv.current = false;
    };
    rec.onend = () => {
      setZwischen("");
      if (willAktiv.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fällt unten durch */
        }
      }
      setAktiv(false);
    };
    recRef.current = rec;
    willAktiv.current = true;
    setFehler(null);
    setAktiv(true);
    rec.start();
  }, []);

  const stop = useCallback(() => {
    willAktiv.current = false;
    recRef.current?.stop();
  }, []);

  return { unterstuetzt, aktiv, text, setText, zwischen, fehler, start, stop };
}
