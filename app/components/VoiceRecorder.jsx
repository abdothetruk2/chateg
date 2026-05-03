"use client";

import { useState, useRef } from "react";
import { Mic, Square } from "lucide-react";
export default function VoiceRecorder({ onSend }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
  ? "audio/mp4"
  : MediaRecorder.isTypeSupported("audio/mpeg")
  ? "audio/mpeg"
  : "audio/webm";
    const mediaRecorder = new MediaRecorder(stream,{mimeType} );
    mediaRecorderRef.current = mediaRecorder;
    chunks.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/mp3" });
      onSend(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }

  return (
    <div className="shrink-0">
      {!recording ? (
        <button
          type="button"
          onClick={startRecording}
          className="app-icon-button rounded-2xl p-3"
          title="Record voice"
        >
          <Mic className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-red-100 transition hover:-translate-y-0.5 hover:bg-red-500/20"
          title="Stop recording"
        >
          <Square className="h-5 w-5 fill-current" />
        </button>
      )}
    </div>
  );
}
