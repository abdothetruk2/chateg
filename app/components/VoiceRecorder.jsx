"use client";

import { useState, useRef } from "react";
import { Mic } from "lucide-react";
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
      onSend(blob); // نبعت الصوت
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }

  return (
    <div>
      {!recording ? (
        <button onClick={startRecording}><Mic/> </button>
      ) : (
        <button onClick={stopRecording}>⏹ Stop</button>
      )}
    </div>
  );
}