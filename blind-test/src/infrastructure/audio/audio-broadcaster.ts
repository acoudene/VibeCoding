import type { SignalingChannel } from "./signaling";

export type BroadcasterConnectionState = "new" | "connecting" | "connected" | "failed" | "closed";

type PerPeerState = {
  pc: RTCPeerConnection;
  state: BroadcasterConnectionState;
  pendingRemoteIce: RTCIceCandidateInit[];
};

export type AudioBroadcasterDeps = {
  selfId: string;
  rtcConfig: RTCConfiguration;
  signaling: SignalingChannel;
  // Injectable for tests; default uses the real RTCPeerConnection.
  rtcFactory?: (config: RTCConfiguration) => RTCPeerConnection;
};

export class AudioBroadcaster {
  private readonly peers = new Map<string, PerPeerState>();
  private stream: MediaStream | null = null;
  private listeners: ((playerId: string, state: BroadcasterConnectionState) => void)[] = [];
  private unsubscribe: (() => void) | null = null;
  private readonly rtcFactory: (config: RTCConfiguration) => RTCPeerConnection;

  constructor(private readonly deps: AudioBroadcasterDeps) {
    this.rtcFactory = deps.rtcFactory ?? ((cfg) => new RTCPeerConnection(cfg));
    this.unsubscribe = deps.signaling.subscribe((signal) => {
      if (signal.to !== deps.selfId) return;
      void this.handleSignal(signal);
    });
  }

  setStream(stream: MediaStream): void {
    this.stream = stream;
    // Add the stream to every existing peer that has not started yet,
    // and replace the audio track on the others.
    for (const [playerId, state] of this.peers) {
      this.attachStreamTo(state.pc, stream);
      if (state.state === "new") {
        void this.startNegotiation(playerId, state);
      }
    }
  }

  async connect(playerId: string): Promise<void> {
    if (this.peers.has(playerId)) return;
    const pc = this.rtcFactory(this.deps.rtcConfig);
    const state: PerPeerState = { pc, state: "new", pendingRemoteIce: [] };
    this.peers.set(playerId, state);

    pc.onicecandidate = (ev) => {
      this.deps.signaling.send({
        kind: "ice",
        from: this.deps.selfId,
        to: playerId,
        candidate: ev.candidate ? ev.candidate.toJSON() : null,
      });
    };

    pc.onconnectionstatechange = () => {
      const next = mapPcState(pc.connectionState);
      this.transition(playerId, next);
    };

    if (this.stream) {
      this.attachStreamTo(pc, this.stream);
      await this.startNegotiation(playerId, state);
    }
  }

  disconnect(playerId: string): void {
    const state = this.peers.get(playerId);
    if (!state) return;
    state.pc.close();
    this.peers.delete(playerId);
    this.transition(playerId, "closed");
  }

  disconnectAll(): void {
    for (const id of [...this.peers.keys()]) this.disconnect(id);
  }

  stop(): void {
    this.disconnectAll();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
  }

  onStateChange(
    listener: (playerId: string, state: BroadcasterConnectionState) => void,
  ): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(playerId: string): BroadcasterConnectionState | undefined {
    return this.peers.get(playerId)?.state;
  }

  private attachStreamTo(pc: RTCPeerConnection, stream: MediaStream): void {
    const senders = pc.getSenders();
    for (const track of stream.getAudioTracks()) {
      const sender = senders.find((s) => s.track?.kind === "audio");
      if (sender) {
        void sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    }
  }

  private async startNegotiation(playerId: string, state: PerPeerState): Promise<void> {
    this.transition(playerId, "connecting");
    const offer = await state.pc.createOffer({ offerToReceiveAudio: false });
    await state.pc.setLocalDescription(offer);
    this.deps.signaling.send({
      kind: "offer",
      from: this.deps.selfId,
      to: playerId,
      sdp: offer,
    });
  }

  private async handleSignal(signal: {
    kind: "offer" | "answer" | "ice";
    from: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit | null;
  }): Promise<void> {
    const playerId = signal.from;
    const state = this.peers.get(playerId);
    if (!state) return; // Signal for an unknown peer.
    if (signal.kind === "answer" && signal.sdp) {
      await state.pc.setRemoteDescription(signal.sdp);
      // Apply any ICE candidates that arrived before the answer.
      for (const c of state.pendingRemoteIce) {
        await state.pc.addIceCandidate(c).catch(() => undefined);
      }
      state.pendingRemoteIce.length = 0;
      return;
    }
    if (signal.kind === "ice") {
      if (signal.candidate === null || signal.candidate === undefined) return;
      if (state.pc.remoteDescription) {
        await state.pc.addIceCandidate(signal.candidate).catch(() => undefined);
      } else {
        state.pendingRemoteIce.push(signal.candidate);
      }
    }
  }

  private transition(playerId: string, next: BroadcasterConnectionState): void {
    const state = this.peers.get(playerId);
    if (state && state.state === next) return;
    if (state) state.state = next;
    for (const l of this.listeners) l(playerId, next);
  }
}

function mapPcState(s: RTCPeerConnectionState): BroadcasterConnectionState {
  switch (s) {
    case "new":
      return "new";
    case "connecting":
      return "connecting";
    case "connected":
      return "connected";
    case "disconnected":
    case "failed":
      return "failed";
    case "closed":
      return "closed";
    default:
      return "new";
  }
}
