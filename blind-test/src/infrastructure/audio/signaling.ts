export type RtcSignalKind = "offer" | "answer" | "ice";

export type RtcOffer = { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit };
export type RtcAnswer = {
  kind: "answer";
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
};
export type RtcIce = {
  kind: "ice";
  from: string;
  to: string;
  candidate: RTCIceCandidateInit | null;
};
export type RtcSignal = RtcOffer | RtcAnswer | RtcIce;

export type SignalingChannel = {
  send(signal: RtcSignal): void;
  subscribe(handler: (signal: RtcSignal) => void): () => void;
};
