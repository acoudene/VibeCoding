"use client";

import type { PresenceChannel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AudioBroadcaster,
  type BroadcasterConnectionState,
} from "@/infrastructure/audio/audio-broadcaster";
import {
  AudioCaptureDeniedError,
  AudioCaptureNoTrackError,
  AudioCaptureUnsupportedError,
  captureTabAudio,
} from "@/infrastructure/audio/audio-capture";
import { buildRtcConfiguration } from "@/infrastructure/audio/ice-config";
import { PusherSignalingChannel } from "@/infrastructure/audio/pusher-signaling";

export type AudioState = "idle" | "ready" | "unsupported" | "denied" | "error";
export type PlayerAudioState = BroadcasterConnectionState;

export type UseAudioBroadcaster = {
  state: AudioState;
  errorMessage: string | null;
  playerStates: ReadonlyMap<string, PlayerAudioState>;
  enableAudio: () => Promise<void>;
  connectPlayer: (playerId: string) => void;
  disconnectPlayer: (playerId: string) => void;
};

type Args = {
  hostId: string;
  presenceChannel: PresenceChannel | null;
};

export function useAudioBroadcaster({ hostId, presenceChannel }: Args): UseAudioBroadcaster {
  const [state, setState] = useState<AudioState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerStates, setPlayerStates] = useState<Map<string, PlayerAudioState>>(new Map());
  const broadcasterRef = useRef<AudioBroadcaster | null>(null);
  const signalingRef = useRef<PusherSignalingChannel | null>(null);

  useEffect(() => {
    if (!presenceChannel) return;

    const signaling = new PusherSignalingChannel(presenceChannel);
    signalingRef.current = signaling;

    const broadcaster = new AudioBroadcaster({
      selfId: hostId,
      rtcConfig: buildRtcConfiguration(),
      signaling,
    });
    broadcaster.onStateChange((playerId, s) => {
      setPlayerStates((prev) => {
        const next = new Map(prev);
        if (s === "closed") next.delete(playerId);
        else next.set(playerId, s);
        return next;
      });
    });
    broadcasterRef.current = broadcaster;

    return () => {
      broadcaster.stop();
      signaling.dispose();
      broadcasterRef.current = null;
      signalingRef.current = null;
      setPlayerStates(new Map());
    };
  }, [presenceChannel, hostId]);

  const connectPlayer = useCallback((playerId: string) => {
    void broadcasterRef.current?.connect(playerId);
  }, []);

  const disconnectPlayer = useCallback((playerId: string) => {
    broadcasterRef.current?.disconnect(playerId);
  }, []);

  const enableAudio = useCallback(async () => {
    try {
      const stream = await captureTabAudio();
      broadcasterRef.current?.setStream(stream);
      setErrorMessage(null);
      setState("ready");
    } catch (err) {
      if (err instanceof AudioCaptureUnsupportedError) {
        setState("unsupported");
        setErrorMessage(
          "Ce navigateur ne supporte pas la capture audio. Utilise Chrome/Edge/Firefox récent.",
        );
        return;
      }
      if (err instanceof AudioCaptureDeniedError) {
        setState("denied");
        setErrorMessage("Capture audio refusée. Réessaie en autorisant le partage de l'onglet.");
        return;
      }
      if (err instanceof AudioCaptureNoTrackError) {
        setState("error");
        setErrorMessage("L'onglet sélectionné n'a pas d'audio. Coche bien « Partager l'audio ».");
        return;
      }
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, []);

  return {
    state,
    errorMessage,
    playerStates,
    enableAudio,
    connectPlayer,
    disconnectPlayer,
  };
}
