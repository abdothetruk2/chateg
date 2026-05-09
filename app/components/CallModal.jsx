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
  const remoteStreamRef = useRef(null);
  const startCallTimeoutRef = useRef(null);
  const callRecordIdRef = useRef("");
  const pendingIceCandidatesRef = useRef([]);
  const startedCallRef = useRef(false);
  const acceptedCallRef = useRef(false);
  const endingCallRef = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === "video");
  const [status, setStatus] = useState("Ready");
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
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

  function getCallId() {
    return callRecordIdRef.current || incomingCall?.callId || "";
  }

  function isCurrentSignal(data = {}) {
    if (data.from && data.from === myName) return false;

    const currentCallId = getCallId();
    if (currentCallId && data.callId && data.callId !== currentCallId) {
      return false;
    }

    return true;
  }

  function getMediaErrorMessage(error, type = "video") {
    if (!navigator.mediaDevices?.getUserMedia) {
      return "This browser does not support camera or microphone access.";
    }

    if (error?.name === "NotAllowedError") {
      return "Camera or microphone permission was denied.";
    }

    if (error?.name === "NotFoundError") {
      return type === "video"
        ? "No camera was found. The call can continue with audio only."
        : "No microphone was found.";
    }

    if (
      error?.name === "NotReadableError" ||
      error?.name === "TrackStartError" ||
      /starting videoinput failed/i.test(error?.message || "")
    ) {
      return "Camera is already in use or could not start. The call can continue with audio only.";
    }

    return error?.message || "Could not start the call.";
  }

  async function createCallRecord() {
    if (callRecordIdRef.current) return callRecordIdRef.current;

    const response = await fetch("/api/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caller: myName,
        receiver: roomName ? "" : friendName,
        room: roomName || "",
        callType: activeCallType,
        status: "ringing",
      }),
    });

    if (!response.ok) return "";

    const data = await response.json();
    callRecordIdRef.current = data?.call?._id || "";
    return callRecordIdRef.current;
  }

  async function updateCallRecord(nextStatus) {
    const callId = callRecordIdRef.current || incomingCall?.callId || "";
    if (!callId) return;

    try {
      await fetch(`/api/calls/${callId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (error) {
      console.error("Call history update failed:", error);
    }
  }

  async function getMedia(type = "video") {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera or microphone access.");
    }

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
    } catch (error) {
      if (type !== "video") throw error;

      console.warn("Video input failed, retrying with audio only:", error);
      setStatus(getMediaErrorMessage(error, type));
      setCamOn(false);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }

    localStreamRef.current = stream;
    setMicOn(Boolean(stream.getAudioTracks()[0]?.enabled));
    setCamOn(Boolean(stream.getVideoTracks()[0]?.enabled));

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }

  function attachRemoteStream(stream) {
    if (!stream || !remoteVideoRef.current) return;

    if (remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
    }

    remoteVideoRef.current.play?.().catch(() => {});
  }

  function handleRemoteTrack(event) {
    const stream = event.streams?.[0] || remoteStreamRef.current || new MediaStream();
    const track = event.track;

    remoteStreamRef.current = stream;

    if (track && !stream.getTracks().some((item) => item.id === track.id)) {
      stream.addTrack(track);
    }

    setHasRemoteStream(true);

    if (track?.kind === "video") {
      setHasRemoteVideo(true);
      track.onunmute = () => setHasRemoteVideo(true);
      track.onended = () => {
        setHasRemoteVideo(
          stream.getVideoTracks().some((videoTrack) => videoTrack.readyState === "live")
        );
      };
    }

    attachRemoteStream(stream);
  }

  function createPeer() {
    if (peerRef.current && peerRef.current.signalingState !== "closed") {
      peerRef.current.close();
    }

    const peer = new RTCPeerConnection(iceServers);

    peer.ontrack = handleRemoteTrack;

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setStatus("Connected");
      }

      if (peer.connectionState === "failed") {
        setStatus("Call connection failed.");
      }

      if (peer.connectionState === "disconnected") {
        setStatus("Call disconnected.");
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "checking") {
        setStatus("Connecting media...");
      }

      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        setStatus("Connected");
      }

      if (peer.iceConnectionState === "failed") {
        setStatus("Media connection failed.");
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          from: myName,
          to: signalingTarget,
          room: !incomingCall && roomName ? roomName : undefined,
          callId: getCallId(),
          candidate: event.candidate,
        });
      }
    };

    peerRef.current = peer;
    return peer;
  }

  async function addIceCandidate(candidate) {
    const peer = peerRef.current;

    if (!peer) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    if (peer.signalingState === "closed") return;

    if (!peer.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      if (/ufrag/i.test(error?.message || "")) {
        console.warn("Ignored stale ICE candidate:", error.message);
        return;
      }

      console.warn("Could not add ICE candidate:", error);
    }
  }

  async function flushPendingIceCandidates() {
    if (!peerRef.current?.remoteDescription) return;

    const candidates = pendingIceCandidatesRef.current.splice(0);

    for (const candidate of candidates) {
      await addIceCandidate(candidate);
    }
  }

  async function startCall() {
    if (!socket || !myName || !signalingTarget) return;
    if (startedCallRef.current) return;

    startedCallRef.current = true;
    endingCallRef.current = false;

    try {
      setStatus("Calling...");
      setCamOn(activeCallType === "video");

      const stream = await getMedia(activeCallType);
      const callId = await createCallRecord();
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
        callId,
      });
    } catch (error) {
      console.error("Start call failed:", error);
      startedCallRef.current = false;
      cleanup();
      setStatus(getMediaErrorMessage(error, activeCallType));
    }
  }

  async function acceptCall() {
    if (!socket || !incomingCall) return;
    if (acceptedCallRef.current) return;

    acceptedCallRef.current = true;
    callRecordIdRef.current = incomingCall.callId || "";
    endingCallRef.current = false;

    try {
      setStatus("Connecting...");
      setCamOn((incomingCall.callType || "video") === "video");

      const stream = await getMedia(incomingCall.callType || "video");
      const peer = createPeer();

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      await peer.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      await flushPendingIceCandidates();

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer-call", {
        from: myName,
        to: incomingCall.from,
        answer,
        callId: callRecordIdRef.current,
      });
      updateCallRecord("accepted");
      setStatus("Connected");
    } catch (error) {
      console.error("Accept call failed:", error);
      acceptedCallRef.current = false;
      cleanup();
      setStatus(getMediaErrorMessage(error, incomingCall.callType || "video"));
    }
  }

  function endCall() {
    if (endingCallRef.current) return;

    endingCallRef.current = true;
    updateCallRecord("ended");
    socket?.emit("end-call", {
      from: myName,
      to: signalingTarget,
      room: roomName || incomingCall?.room || undefined,
      callId: callRecordIdRef.current || incomingCall?.callId || "",
    });

    cleanup();
    onClose?.();
  }

  function cleanup() {
    if (peerRef.current && peerRef.current.signalingState !== "closed") {
      peerRef.current.close();
    }
    peerRef.current = null;
    pendingIceCandidatesRef.current = [];

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteStream(false);
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
      const peer = peerRef.current;
      if (!peer || !isCurrentSignal(data)) return;

      if (peer.signalingState !== "have-local-offer") {
        return;
      }

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushPendingIceCandidates();

        if (data?.callId) callRecordIdRef.current = data.callId;
        updateCallRecord("accepted");
        setStatus("Connected");
      } catch (error) {
        console.warn("Could not apply call answer:", error);
      }
    };

    const handleIce = async (data) => {
      if (!data?.candidate || !isCurrentSignal(data)) return;

      await addIceCandidate(data.candidate);
    };

    const handleEnded = (data) => {
      if (!isCurrentSignal(data)) return;

      updateCallRecord("ended");
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

    callRecordIdRef.current = incomingCall?.callId || "";
    startedCallRef.current = false;
    acceptedCallRef.current = false;
    endingCallRef.current = false;
    pendingIceCandidatesRef.current = [];

    const resetStateTimer = setTimeout(() => {
      setStatus("Ready");
      setHasRemoteStream(false);
      setHasRemoteVideo(false);
    }, 0);

    if (incomingCall) {
      return () => clearTimeout(resetStateTimer);
    }

    startCallTimeoutRef.current = setTimeout(() => {
      startCall();
    }, 0);

    return () => {
      clearTimeout(resetStateTimer);
      clearTimeout(startCallTimeoutRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    attachRemoteStream(remoteStreamRef.current);
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
                {activeCallType === "audio"
                  ? hasRemoteStream
                    ? "Voice call connected"
                    : "Waiting for remote audio..."
                  : hasRemoteStream
                  ? "Remote camera is off"
                  : "Waiting for remote video..."}
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
