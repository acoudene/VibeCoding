import { beforeEach, describe, expect, it } from "vitest";

import { AudioReceiver } from "./audio-receiver";
import { FakeAudioElement, FakePeerConnection, FakeSignalingChannel } from "./test-doubles";

const RTC_CONFIG: RTCConfiguration = { iceServers: [] };

const setup = (overrides: Partial<ConstructorParameters<typeof AudioReceiver>[0]> = {}) => {
  FakePeerConnection.instances.length = 0;
  const signaling = new FakeSignalingChannel();
  const audioInstances: FakeAudioElement[] = [];
  const timers: { cb: () => void; ms: number }[] = [];

  const receiver = new AudioReceiver({
    selfId: "p1",
    hostId: "host-1",
    rtcConfig: RTC_CONFIG,
    signaling,
    rtcFactory: () => new FakePeerConnection() as unknown as RTCPeerConnection,
    audioFactory: () => {
      const a = new FakeAudioElement();
      audioInstances.push(a);
      return a as unknown as HTMLAudioElement;
    },
    setTimeoutFn: (cb, ms) => {
      timers.push({ cb, ms });
      return timers.length;
    },
    clearTimeoutFn: () => undefined,
    ...overrides,
  });

  return { receiver, signaling, audioInstances, timers };
};

const makeFakeStream = (): MediaStream => ({ id: "fake" }) as unknown as MediaStream;

describe("AudioReceiver", () => {
  beforeEach(() => {
    FakePeerConnection.instances.length = 0;
  });

  it("transitions to connecting on start and ignores duplicate starts", () => {
    const { receiver } = setup();
    receiver.start();
    expect(receiver.getState()).toBe("connecting");
    receiver.start();
    expect(FakePeerConnection.instances).toHaveLength(1);
  });

  it("ignores signals destined to another player", async () => {
    const { receiver, signaling } = setup();
    receiver.start();
    signaling.inject({ kind: "offer", from: "host-1", to: "other", sdp: { type: "offer" } });
    expect(FakePeerConnection.instances[0]?.remoteDescription).toBeNull();
  });

  it("ignores signals from someone other than the host", async () => {
    const { receiver, signaling } = setup();
    receiver.start();
    signaling.inject({ kind: "offer", from: "p2", to: "p1", sdp: { type: "offer" } });
    expect(FakePeerConnection.instances[0]?.remoteDescription).toBeNull();
  });

  it("answers an offer from the host and publishes the answer", async () => {
    const { receiver, signaling } = setup();
    receiver.start();
    signaling.inject({
      kind: "offer",
      from: "host-1",
      to: "p1",
      sdp: { type: "offer", sdp: "v=fake-offer" },
    });
    // The handler awaits setRemoteDescription, createAnswer, setLocalDescription.
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const answers = signaling.sent.filter((s) => s.kind === "answer");
    expect(answers).toHaveLength(1);
    expect(answers[0]?.to).toBe("host-1");
    expect(FakePeerConnection.instances[0]?.localDescription?.type).toBe("answer");
  });

  it("forwards local ICE candidates back to the host", () => {
    const { receiver, signaling } = setup();
    receiver.start();
    const pc = FakePeerConnection.instances[0]!;
    pc.emitIce({ candidate: "candidate-1" });
    const ice = signaling.sent.filter((s) => s.kind === "ice");
    expect(ice).toHaveLength(1);
    expect(ice[0]?.to).toBe("host-1");
  });

  it("attaches the received stream to a hidden <audio> element on track", () => {
    const { receiver, audioInstances } = setup();
    receiver.start();
    const pc = FakePeerConnection.instances[0]!;
    pc.emitTrack(makeFakeStream());
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0]?.autoplay).toBe(true);
    expect(audioInstances[0]?.srcObject).not.toBeNull();
    expect(audioInstances[0]?.paused).toBe(false);
  });

  it("transitions to connected when the underlying PC reports connected", () => {
    const { receiver } = setup();
    receiver.start();
    const pc = FakePeerConnection.instances[0]!;
    pc.setConnectionState("connected");
    expect(receiver.getState()).toBe("connected");
  });

  it("transitions to failed if the connect timeout fires before connection", () => {
    const { receiver, timers } = setup({ connectTimeoutMs: 10 });
    receiver.start();
    expect(timers).toHaveLength(1);
    timers[0]!.cb();
    expect(receiver.getState()).toBe("failed");
  });

  it("setVolume clamps to [0, 1]", () => {
    const { receiver, audioInstances } = setup();
    receiver.start();
    const pc = FakePeerConnection.instances[0]!;
    pc.emitTrack(makeFakeStream());
    receiver.setVolume(2);
    expect(audioInstances[0]?.volume).toBe(1);
    receiver.setVolume(-1);
    expect(audioInstances[0]?.volume).toBe(0);
    receiver.setVolume(0.42);
    expect(audioInstances[0]?.volume).toBeCloseTo(0.42);
  });

  it("retry tears down the previous PC and starts a new one", () => {
    const { receiver } = setup();
    receiver.start();
    receiver.retry();
    expect(FakePeerConnection.instances).toHaveLength(2);
  });
});
