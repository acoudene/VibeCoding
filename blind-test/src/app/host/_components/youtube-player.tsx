"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

// Minimal types we use from the IFrame API.
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
};

type YTPlayerEvent = { data: number; target: YTPlayer };

type YTPlayerOptions = {
  videoId: string;
  playerVars?: { start?: number; controls?: 0 | 1 };
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
  };
};

type YTGlobal = {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YoutubePlayerRef = {
  play: () => void;
  pause: () => void;
  load: (videoId: string, startSeconds?: number) => void;
};

let apiLoadingPromise: Promise<void> | null = null;
function loadIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadingPromise) return apiLoadingPromise;
  apiLoadingPromise = new Promise<void>((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadingPromise;
}

export function YoutubePlayer({
  videoId,
  startSeconds,
  onReady,
  onPlay,
  onPause,
  ref,
}: {
  videoId: string;
  startSeconds?: number;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  ref?: React.RefObject<YoutubePlayerRef | null>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      load: (id: string, s?: number) =>
        playerRef.current?.loadVideoById({ videoId: id, startSeconds: s }),
    }),
    [],
  );

  const currentVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      const player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { start: startSeconds, controls: 1 },
        events: {
          onReady: () => onReady?.(),
          onStateChange: (e) => {
            // YT.PlayerState: 1 = playing, 2 = paused
            if (e.data === 1) onPlay?.();
            else if (e.data === 2) onPause?.();
          },
        },
      });
      playerRef.current = player;
      currentVideoIdRef.current = videoId;
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      currentVideoIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once; the effect below reacts to videoId/startSeconds changes

  // Reload the video whenever the videoId or startSeconds prop changes
  // (e.g. host advances to the next track). Skips the initial load handled
  // by the constructor above.
  useEffect(() => {
    if (!playerRef.current) return;
    if (currentVideoIdRef.current === videoId) return;
    playerRef.current.loadVideoById({ videoId, startSeconds });
    currentVideoIdRef.current = videoId;
  }, [videoId, startSeconds]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
