"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function CallModal({
  open,
  onClose,
  socket,
  currentUser,
  selectedUser,
  incomingCall,
  callType = "video",
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const startCallTimeoutRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === "video");
  const [status, setStatus] = useState("Ready");
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const myName = currentUser?.username;
  const roomName =
    selectedUser?.type === "group" ? selectedUser?.name : incomingCall?.room;
  const friendName =
    selectedUser?.type === "group"
      ? selectedUser?.name
      : selectedUser?.username || incomingCall?.from;
  const signalingTarget = incomingCall?.from || roomName || friendName;
  const activeCallType = incomingCall?.callType || callType;
  const callStatus =
    incomingCall && status === "Ready"
      ? `${incomingCall.from} is calling...`
      : status;

  async function getMedia(type = "video") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }

  function createPeer() {
    const peer = new RTCPeerConnection(iceServers);

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteVideo(true);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          from: myName,
          to: signalingTarget,
          room: !incomingCall && roomName ? roomName : undefined,
          candidate: event.candidate,
        });
      }
    };

    peerRef.current = peer;
    return peer;
  }

  async function startCall() {
    if (!socket || !myName || !signalingTarget) return;

    setStatus("Calling...");
    setCamOn(activeCallType === "video");

    const stream = await getMedia(activeCallType);
    const peer = createPeer();

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("call-user", {
      from: myName,
      to: signalingTarget,
      room: roomName || undefined,
      offer,
      callType: activeCallType,
    });
  }

  async function acceptCall() {
    if (!socket || !incomingCall) return;

    setStatus("Connected");
    setCamOn((incomingCall.callType || "video") === "video");

    const stream = await getMedia(incomingCall.callType || "video");
    const peer = createPeer();

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    await peer.setRemoteDescription(
      new RTCSessionDescription(incomingCall.offer)
    );

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answer-call", {
      from: myName,
      to: incomingCall.from,
      answer,
    });
  }

  function endCall() {
    socket?.emit("end-call", {
      from: myName,
      to: signalingTarget,
      room: roomName || incomingCall?.room || undefined,
    });

    cleanup();
    onClose?.();
  }

  function cleanup() {
    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteVideo(false);
  }

  function toggleMic() {
    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  }

  function toggleCamera() {
    const videoTrack = localStreamRef.current?.getVideoTracks()?.[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setCamOn(videoTrack.enabled);
  }

  useEffect(() => {
    if (!open || !socket) return;

    const handleAnswered = async (data) => {
      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      setStatus("Connected");
    };

    const handleIce = async (data) => {
      if (!peerRef.current || !data?.candidate) return;

      await peerRef.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    };

    const handleEnded = () => {
      cleanup();
      onClose?.();
    };

    socket.on("call-answered", handleAnswered);
    socket.on("ice-candidate", handleIce);
    socket.on("call-ended", handleEnded);

    return () => {
      socket.off("call-answered", handleAnswered);
      socket.off("ice-candidate", handleIce);
      socket.off("call-ended", handleEnded);
      cleanup();
    };
  }, [open, socket]);

  useEffect(() => {
    if (!open) return;

    if (incomingCall) {
      return;
    }

    startCallTimeoutRef.current = setTimeout(() => {
      startCall();
    }, 0);

    return () => clearTimeout(startCallTimeoutRef.current);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-2 backdrop-blur-xl sm:p-4">
      <div className="flex max-h-[calc(100svh_-_1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b0f19] shadow-2xl sm:max-h-[calc(100svh_-_2rem)] sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white sm:text-lg">
              {roomName || friendName || "Call"}
            </h2>
            <p className="truncate text-sm text-slate-400">{callStatus}</p>
          </div>

          {incomingCall && (
            <button
              onClick={acceptCall}
              className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 sm:px-5"
            >
              Accept
            </button>
          )}
        </div>

        <div className="relative min-h-0 flex-1 p-3 sm:p-4 md:grid md:grid-cols-2 md:gap-4">
          <div className="relative h-[min(58svh,34rem)] min-h-[18rem] overflow-hidden rounded-[1.35rem] bg-black sm:rounded-3xl md:h-[420px] md:min-h-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
                Waiting for remote video...
              </div>
            )}
          </div>

          <div className="absolute bottom-6 right-6 h-32 w-24 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl shadow-black/50 sm:h-36 sm:w-28 md:relative md:bottom-auto md:right-auto md:h-[420px] md:w-auto md:rounded-3xl md:border-0 md:shadow-none">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-slate-400 sm:text-sm">
                Camera off
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 px-4 py-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:gap-4 sm:p-5 sm:pb-5">
          <button
            onClick={toggleMic}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            type="button"
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          {activeCallType === "video" && (
            <button
              onClick={toggleCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              type="button"
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            >
              {camOn ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
          )}

          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
            type="button"
            aria-label="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
