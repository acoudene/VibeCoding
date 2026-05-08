import type { RtcSignal, SignalingChannel } from "./signaling";

export class FakeSignalingChannel implements SignalingChannel {
  readonly sent: RtcSignal[] = [];
  private listeners: ((signal: RtcSignal) => void)[] = [];

  send(signal: RtcSignal): void {
    this.sent.push(signal);
  }

  subscribe(handler: (signal: RtcSignal) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  // Simulate an inbound signal arriving from the network.
  inject(signal: RtcSignal): void {
    for (const l of this.listeners) l(signal);
  }
}

type Listener = () => void;

export class FakePeerConnection {
  static instances: FakePeerConnection[] = [];

  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  connectionState: RTCPeerConnectionState = "new";
  onicecandidate:
    | ((ev: { candidate: { toJSON: () => RTCIceCandidateInit } | null }) => void)
    | null = null;
  onconnectionstatechange: Listener | null = null;
  ontrack: ((ev: { streams: MediaStream[] }) => void) | null = null;
  readonly tracks: { track: MediaStreamTrack; stream: MediaStream }[] = [];
  readonly addedIceCandidates: RTCIceCandidateInit[] = [];

  constructor() {
    FakePeerConnection.instances.push(this);
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream): void {
    this.tracks.push({ track, stream });
  }

  getSenders(): {
    track: MediaStreamTrack | null;
    replaceTrack: (t: MediaStreamTrack) => Promise<void>;
  }[] {
    return this.tracks.map(({ track }) => ({
      track,
      replaceTrack: () => Promise.resolve(),
    }));
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "v=fake-offer" };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: "answer", sdp: "v=fake-answer" };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.addedIceCandidates.push(candidate);
  }

  close(): void {
    this.connectionState = "closed";
    this.onconnectionstatechange?.();
  }

  // Test helpers.
  emitIce(candidate: RTCIceCandidateInit | null): void {
    this.onicecandidate?.({ candidate: candidate ? { toJSON: () => candidate } : null });
  }

  setConnectionState(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }

  emitTrack(stream: MediaStream): void {
    this.ontrack?.({ streams: [stream] });
  }
}

export class FakeAudioElement {
  autoplay = false;
  srcObject: MediaStream | null = null;
  volume = 1;
  paused = true;

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

export function makeFakeStream(): MediaStream {
  const fakeTrack = { kind: "audio", stop: () => undefined } as unknown as MediaStreamTrack;
  return {
    getAudioTracks: () => [fakeTrack],
    getVideoTracks: () => [],
    getTracks: () => [fakeTrack],
    removeTrack: () => undefined,
  } as unknown as MediaStream;
}
