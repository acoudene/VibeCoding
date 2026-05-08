import { beforeEach, describe, expect, it } from "vitest";

import { AudioBroadcaster } from "./audio-broadcaster";
import { FakePeerConnection, FakeSignalingChannel, makeFakeStream } from "./test-doubles";

const RTC_CONFIG: RTCConfiguration = { iceServers: [] };

const setup = () => {
  FakePeerConnection.instances.length = 0;
  const signaling = new FakeSignalingChannel();
  const broadcaster = new AudioBroadcaster({
    selfId: "host-1",
    rtcConfig: RTC_CONFIG,
    signaling,
    rtcFactory: () => new FakePeerConnection() as unknown as RTCPeerConnection,
  });
  return { broadcaster, signaling };
};

describe("AudioBroadcaster", () => {
  beforeEach(() => {
    FakePeerConnection.instances.length = 0;
  });

  it("does not negotiate before a stream is set", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    expect(signaling.sent).toHaveLength(0);
    expect(broadcaster.getState("p1")).toBe("new");
  });

  it("publishes an offer for each connected peer once a stream is set", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    await broadcaster.connect("p2");
    broadcaster.setStream(makeFakeStream());
    // Allow microtasks to flush.
    await Promise.resolve();
    await Promise.resolve();
    const offers = signaling.sent.filter((s) => s.kind === "offer");
    expect(offers).toHaveLength(2);
    const recipients = new Set(offers.map((o) => o.to));
    expect(recipients).toEqual(new Set(["p1", "p2"]));
    expect(offers.every((o) => o.from === "host-1")).toBe(true);
  });

  it("forwards local ICE candidates to the targeted peer", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    const pc = FakePeerConnection.instances[0]!;
    pc.emitIce({ candidate: "ice1", sdpMid: "0", sdpMLineIndex: 0 });
    pc.emitIce(null); // end-of-candidates
    const ice = signaling.sent.filter((s) => s.kind === "ice" && s.to === "p1");
    expect(ice).toHaveLength(2);
    expect(ice[0]?.kind === "ice" && ice[0]?.candidate?.candidate).toBe("ice1");
    expect(ice[1]?.kind === "ice" && ice[1]?.candidate).toBeNull();
  });

  it("ignores signals destined to another peer", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    signaling.inject({ kind: "answer", from: "p1", to: "host-2", sdp: { type: "answer" } });
    expect(FakePeerConnection.instances[0]?.remoteDescription).toBeNull();
  });

  it("applies an answer to the matching peer", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    signaling.inject({
      kind: "answer",
      from: "p1",
      to: "host-1",
      sdp: { type: "answer", sdp: "v=fake-answer" },
    });
    await Promise.resolve();
    expect(FakePeerConnection.instances[0]?.remoteDescription?.type).toBe("answer");
  });

  it("buffers ICE candidates received before the answer and applies them once the remote description is set", async () => {
    const { broadcaster, signaling } = setup();
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    const pc = FakePeerConnection.instances[0]!;
    signaling.inject({
      kind: "ice",
      from: "p1",
      to: "host-1",
      candidate: { candidate: "early-ice" },
    });
    expect(pc.addedIceCandidates).toHaveLength(0);
    signaling.inject({
      kind: "answer",
      from: "p1",
      to: "host-1",
      sdp: { type: "answer", sdp: "v=fake-answer" },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(pc.addedIceCandidates).toHaveLength(1);
  });

  it("emits state transitions through onStateChange", async () => {
    const { broadcaster } = setup();
    const states: { id: string; s: string }[] = [];
    broadcaster.onStateChange((id, s) => states.push({ id, s }));
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    const pc = FakePeerConnection.instances[0]!;
    pc.setConnectionState("connecting");
    pc.setConnectionState("connected");
    expect(states.map((s) => s.s)).toContain("connecting");
    expect(states.map((s) => s.s)).toContain("connected");
  });

  it("disconnect closes the peer and removes it", async () => {
    const { broadcaster } = setup();
    await broadcaster.connect("p1");
    broadcaster.setStream(makeFakeStream());
    await Promise.resolve();
    broadcaster.disconnect("p1");
    expect(broadcaster.getState("p1")).toBeUndefined();
    expect(FakePeerConnection.instances[0]?.connectionState).toBe("closed");
  });
});
