import type { SignalingChannel } from "./signaling";

export type ReceiverState = "idle" | "connecting" | "connected" | "failed" | "closed";

export type AudioReceiverDeps = {
  selfId: string;
  hostId: string;
  rtcConfig: RTCConfiguration;
  signaling: SignalingChannel;
  rtcFactory?: (config: RTCConfiguration) => RTCPeerConnection;
  audioFactory?: () => HTMLAudioElement;
  connectTimeoutMs?: number;
  // Returns a clearable timer id. Defaults wrap the standard browser timer APIs.
  setTimeoutFn?: (cb: () => void, ms: number) => unknown;
  clearTimeoutFn?: (id: unknown) => void;
};

export class AudioReceiver {
  private pc: RTCPeerConnection | null = null;
  private audio: HTMLAudioElement | null = null;
  private state: ReceiverState = "idle";
  private listeners: ((state: ReceiverState) => void)[] = [];
  private unsubscribe: (() => void) | null = null;
  private connectTimer: unknown = null;
  private pendingRemoteIce: RTCIceCandidateInit[] = [];
  private readonly rtcFactory: (config: RTCConfiguration) => RTCPeerConnection;
  private readonly audioFactory: () => HTMLAudioElement;
  private readonly setTimeoutFn: (cb: () => void, ms: number) => unknown;
  private readonly clearTimeoutFn: (id: unknown) => void;
  private readonly connectTimeoutMs: number;

  constructor(private readonly deps: AudioReceiverDeps) {
    this.rtcFactory = deps.rtcFactory ?? ((cfg) => new RTCPeerConnection(cfg));
    this.audioFactory = deps.audioFactory ?? (() => new Audio());
    this.setTimeoutFn = deps.setTimeoutFn ?? ((cb, ms) => globalThis.setTimeout(cb, ms));
    this.clearTimeoutFn = deps.clearTimeoutFn ?? ((id) => globalThis.clearTimeout(id as number));
    this.connectTimeoutMs = deps.connectTimeoutMs ?? 10_000;
  }

  start(): void {
    if (this.pc) return;
    const pc = this.rtcFactory(this.deps.rtcConfig);
    this.pc = pc;
    this.transition("connecting");

    pc.onicecandidate = (ev) => {
      this.deps.signaling.send({
        kind: "ice",
        from: this.deps.selfId,
        to: this.deps.hostId,
        candidate: ev.candidate ? ev.candidate.toJSON() : null,
      });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;
      const audio = this.audioFactory();
      audio.autoplay = true;
      audio.srcObject = stream;
      void audio.play().catch(() => undefined);
      this.audio = audio;
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          this.clearConnectTimer();
          this.transition("connected");
          break;
        case "failed":
        case "disconnected":
          this.transition("failed");
          break;
        case "closed":
          this.transition("closed");
          break;
        default:
          break;
      }
    };

    this.unsubscribe = this.deps.signaling.subscribe((signal) => {
      if (signal.to !== this.deps.selfId) return;
      if (signal.from !== this.deps.hostId) return;
      void this.handleSignal(signal);
    });

    this.connectTimer = this.setTimeoutFn(() => {
      if (this.state !== "connected") this.transition("failed");
    }, this.connectTimeoutMs);
  }

  retry(): void {
    this.stop();
    this.start();
  }

  setVolume(value: number): void {
    if (!this.audio) return;
    const v = Math.max(0, Math.min(1, value));
    this.audio.volume = v;
  }

  stop(): void {
    this.clearConnectTimer();
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
      this.audio = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.pendingRemoteIce.length = 0;
    this.transition("closed");
  }

  onStateChange(listener: (state: ReceiverState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): ReceiverState {
    return this.state;
  }

  private async handleSignal(signal: {
    kind: "offer" | "answer" | "ice";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit | null;
  }): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    if (signal.kind === "offer" && signal.sdp) {
      await pc.setRemoteDescription(signal.sdp);
      for (const c of this.pendingRemoteIce) {
        await pc.addIceCandidate(c).catch(() => undefined);
      }
      this.pendingRemoteIce.length = 0;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.deps.signaling.send({
        kind: "answer",
        from: this.deps.selfId,
        to: this.deps.hostId,
        sdp: answer,
      });
      return;
    }
    if (signal.kind === "ice") {
      if (signal.candidate === null || signal.candidate === undefined) return;
      if (pc.remoteDescription) {
        await pc.addIceCandidate(signal.candidate).catch(() => undefined);
      } else {
        this.pendingRemoteIce.push(signal.candidate);
      }
    }
  }

  private transition(next: ReceiverState): void {
    if (this.state === next) return;
    this.state = next;
    for (const l of this.listeners) l(next);
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      this.clearTimeoutFn(this.connectTimer);
      this.connectTimer = null;
    }
  }
}
