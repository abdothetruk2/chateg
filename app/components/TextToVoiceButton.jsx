"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function TextToVoiceButton({
  text = "",
  lang = "",
  className = "",
  disabled = false,
  title = "Text to voice",
}) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const cleanText = String(text || "").trim();
  const isDisabled = disabled || !cleanText;

  function stopSpeaking() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }

  function speakText() {
    if (isDisabled) return;

    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      window.alert("Text to voice is not supported in this browser");
      return;
    }

    if (speaking) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
    utterance.lang = lang || (hasArabic ? "ar-EG" : "en-US");
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={speakText}
      disabled={isDisabled}
      className={className}
      title={speaking ? "Stop voice" : title}
      aria-label={speaking ? "Stop voice" : title}
    >
      {speaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}
