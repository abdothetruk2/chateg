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

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === "video");
  const [status, setStatus] = useState("Ready");

  const myName = currentUser?.username;
  const friendName = selectedUser?.username || incomingCall?.from;

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
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          from: myName,
          to: friendName,
          candidate: event.candidate,
        });
      }
    };

    peerRef.current = peer;
    return peer;
  }

  async function startCall() {
    if (!socket || !myName || !friendName) return;

    setStatus("Calling...");

    const stream = await getMedia(callType);
    const peer = createPeer();

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("call-user", {
      from: myName,
      to: friendName,
      offer,
      callType,
    });
  }

  async function acceptCall() {
    if (!socket || !incomingCall) return;

    setStatus("Connected");

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
      to: friendName,
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
      setStatus(`${incomingCall.from} is calling...`);
      return;
    }

    startCall();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0f19] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {friendName || "Call"}
            </h2>
            <p className="text-sm text-slate-400">{status}</p>
          </div>

          {incomingCall && (
            <button
              onClick={acceptCall}
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-600"
            >
              Accept
            </button>
          )}
        </div>

        <div className="relative grid gap-4 p-4 md:grid-cols-2">
          <div className="relative h-[420px] overflow-hidden rounded-3xl bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {!remoteVideoRef.current?.srcObject && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                Waiting for remote video...
              </div>
            )}
          </div>

          <div className="relative h-[420px] overflow-hidden rounded-3xl bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                Camera off
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-white/10 p-5">
          <button
            onClick={toggleMic}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            {micOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          {callType === "video" && (
            <button
              onClick={toggleCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              {camOn ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
          )}

          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}