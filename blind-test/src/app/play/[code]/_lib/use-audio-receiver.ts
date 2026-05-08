"use client";

import type { PresenceChannel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { AudioReceiver, type ReceiverState } from "@/infrastructure/audio/audio-receiver";
import { buildRtcConfiguration } from "@/infrastructure/audio/ice-config";
import { PusherSignalingChannel } from "@/infrastructure/audio/pusher-signaling";

export type UseAudioReceiver = {
  state: ReceiverState;
  setVolume: (v: number) => void;
  retry: () => void;
};

type Args = {
  selfId: string;
  hostId: string;
  presenceChannel: PresenceChannel | null;
};

export function useAudioReceiver({ selfId, hostId, presenceChannel }: Args): UseAudioReceiver {
  const [state, setState] = useState<ReceiverState>("idle");
  const receiverRef = useRef<AudioReceiver | null>(null);

  useEffect(() => {
    if (!presenceChannel) return;
    const signaling = new PusherSignalingChannel(presenceChannel);
    const receiver = new AudioReceiver({
      selfId,
      hostId,
      rtcConfig: buildRtcConfiguration(),
      signaling,
    });
    receiver.onStateChange((s) => setState(s));
    receiver.start();
    receiverRef.current = receiver;
    return () => {
      receiver.stop();
      signaling.dispose();
      receiverRef.current = null;
    };
  }, [presenceChannel, selfId, hostId]);

  const setVolume = useCallback((v: number) => receiverRef.current?.setVolume(v), []);
  const retry = useCallback(() => receiverRef.current?.retry(), []);

  return { state, setVolume, retry };
}
