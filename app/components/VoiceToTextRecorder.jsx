"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";

function getBestAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const supportedTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  return (
    supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ""
  );
}

export default function VoiceToTextRecorder({ value = "", onTextChange }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribeAudio(blob) {
    const formData = new FormData();
    formData.append("file", blob, "assemblyai-dictation.webm");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Transcription failed.");
    }

    const transcript = String(data?.text || "").trim();

    if (!transcript) {
      throw new Error("No speech was detected.");
    }

    const currentText = String(value || "").trimEnd();
    onTextChange?.(currentText ? `${currentText} ${transcript}` : transcript);
  }

  async function startRecording() {
    if (status !== "idle") return;

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setError("Browser recording is not supported");
        window.alert("Browser recording is not supported");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = getBestAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedType });

        cleanupStream();
        recorderRef.current = null;
        chunksRef.current = [];

        if (!blob.size) {
          setStatus("idle");
          setError("No speech was captured.");
          return;
        }

        setStatus("transcribing");

        try {
          await transcribeAudio(blob);
          setError("");
        } catch (transcriptionError) {
          setError(transcriptionError?.message || "Transcription failed.");
        } finally {
          setStatus("idle");
        }
      };

      recorder.start();
      setError("");
      setStatus("recording");
    } catch (recordingError) {
      cleanupStream();
      recorderRef.current = null;
      setStatus("idle");
      setError(recordingError?.message || "Could not start voice to text");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      cleanupStream();
    };
  }, []);

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";
  const title = error || (isRecording ? "Stop voice to text" : "Voice to text");

  return (
    <>
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isTranscribing}
        className={`shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${
          isRecording ? "bg-red-500/10 text-red-200 hover:text-red-100" : ""
        } ${
          isTranscribing ? "bg-cyan-300/10 text-cyan-100" : ""
        }`}
        title={title}
        aria-label={title}
      >
        {isTranscribing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {error && <span className="sr-only">{error}</span>}
    </>
  );
}
