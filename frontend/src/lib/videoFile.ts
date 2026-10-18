export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_TYPE = 'video/mp4';
export const BITRATE_WARNING_MBPS = 10;

/** Inspect top-level MP4 headers without loading any box payloads. */
export async function isFastStart(file: Blob): Promise<boolean | null> {
  let offset = 0;
  try {
    for (let boxes = 0; boxes < 64 && offset < file.size; boxes++) {
      if (file.size - offset < 8) return null;
      const header = await file.slice(offset, offset + 8).arrayBuffer();
      if (header.byteLength !== 8) return null;
      const view = new DataView(header);
      const type = String.fromCharCode(...new Uint8Array(header, 4, 4));
      let size = view.getUint32(0);
      let headerSize = 8;

      if (size === 1) {
        if (file.size - offset < 16) return null;
        const extended = await file.slice(offset + 8, offset + 16).arrayBuffer();
        if (extended.byteLength !== 8) return null;
        const largeSize = new DataView(extended).getBigUint64(0);
        if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        size = Number(largeSize);
        headerSize = 16;
      } else if (size === 0) {
        size = file.size - offset;
      }

      if (size < headerSize || size > file.size - offset) return null;
      if (type === 'moov') return true;
      if (type === 'mdat') return false;
      offset += size;
    }
  } catch {
    return null;
  }
  return null;
}

export function bitrateMbps(sizeBytes: number, durationSeconds: number): number | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  return sizeBytes * 8 / durationSeconds / 1_000_000;
}

export async function extractPoster(file: File): Promise<{ blob: Blob; durationSeconds: number }> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const drawPoster = () => {
        video.onseeked = null;
        try {
          if (!video.videoWidth || !video.videoHeight) throw new Error('Video dimensions are unavailable.');
          const scale = Math.min(1, 2400 / Math.max(video.videoWidth, video.videoHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable.');
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve({ blob, durationSeconds: video.duration });
            else reject(new Error('Could not encode the video poster.'));
          }, 'image/jpeg', 0.9);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('Could not load the video.'));
      video.onloadeddata = () => {
        video.onloadeddata = null;
        video.onseeked = drawPoster;
        try {
          video.currentTime = 0;
          // Seeking to the current frame may not dispatch seeked.
          if (video.readyState >= 2 && !video.seeking) drawPoster();
        } catch (error) {
          reject(error);
        }
      };
      video.src = url;
    });
  } finally {
    video.onloadeddata = null;
    video.onseeked = null;
    video.onerror = null;
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}
