export class AudioCaptureUnsupportedError extends Error {
  constructor() {
    super("getDisplayMedia is not available in this browser");
    this.name = "AudioCaptureUnsupportedError";
  }
}

export class AudioCaptureDeniedError extends Error {
  constructor(cause?: unknown) {
    super("The user denied access to the tab audio");
    this.name = "AudioCaptureDeniedError";
    if (cause instanceof Error) this.cause = cause;
  }
}

export class AudioCaptureNoTrackError extends Error {
  constructor() {
    super("The selected source does not provide an audio track");
    this.name = "AudioCaptureNoTrackError";
  }
}

/**
 * Capture the audio of a browser tab via getDisplayMedia.
 * Browsers require asking for video too — we discard it immediately and only keep the audio tracks.
 */
export async function captureTabAudio(): Promise<MediaStream> {
  const md = (
    globalThis as unknown as {
      navigator?: { mediaDevices?: { getDisplayMedia?: MediaDevices["getDisplayMedia"] } };
    }
  ).navigator?.mediaDevices;
  if (!md || typeof md.getDisplayMedia !== "function") {
    throw new AudioCaptureUnsupportedError();
  }

  let raw: MediaStream;
  try {
    raw = await md.getDisplayMedia({ video: true, audio: true });
  } catch (err) {
    throw new AudioCaptureDeniedError(err);
  }

  for (const v of raw.getVideoTracks()) {
    v.stop();
    raw.removeTrack(v);
  }
  if (raw.getAudioTracks().length === 0) {
    for (const t of raw.getTracks()) t.stop();
    throw new AudioCaptureNoTrackError();
  }
  return raw;
}
