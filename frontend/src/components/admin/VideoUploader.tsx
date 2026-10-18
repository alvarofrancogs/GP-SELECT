import { useEffect, useRef, useState } from 'react';
import { adminApi, ApiError, uploadFile } from '../../services/adminApi';
import type { AdminImage, AdminVideo, ImageIntent, VideoIntent } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';
import { BITRATE_WARNING_MBPS, bitrateMbps, extractPoster, isFastStart, MAX_VIDEO_BYTES, VIDEO_TYPE } from '../../lib/videoFile';
import { uuid } from '../../lib/uuid';

interface VideoUploaderProps {
  vehicleId: string;
  videos: AdminVideo[];
  images: AdminImage[];
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onChange: (keep: string | null | undefined) => void;
}

interface Transfer<T> {
  requestKey: string;
  intent: T | null;
  expiresAt: number | null;
  uploaded: boolean;
  completed: boolean;
}

interface Upload {
  file: File;
  poster: File | null;
  video: Transfer<VideoIntent>;
  image: Transfer<ImageIntent>;
}

const transfer = <T,>(): Transfer<T> => ({ requestKey: uuid(), intent: null, expiresAt: null, uploaded: false, completed: false });

export function VideoUploader({ vehicleId, videos, images, disabled, onBusyChange, onChange }: VideoUploaderProps) {
  const text = adminCopy.video;
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<Upload | null>(null);
  const mounted = useRef(true);
  const running = useRef(false);
  const preview = useRef<string | null>(null);
  const [keep, setKeep] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const video = keep === undefined ? videos.find((item) => !item.isStaged && item.state !== 'Deleted')
    : videos.find((item) => item.id === keep && item.state !== 'Deleted');
  const poster = images.find((image) => image.id === video?.posterImageId);
  const posterFailed = poster?.state === 'Failed';
  const posterProcessing = video && (!poster || poster.state === 'PendingUpload' || poster.state === 'Processing' || poster.jobPending);
  const posterSrc = poster?.cardUrl ?? posterPreview;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (preview.current) URL.revokeObjectURL(preview.current);
    };
  }, []);

  function select(next: string | null | undefined) {
    setKeep(next);
    onChange(next);
  }

  async function send(current: Upload) {
    if (disabled || running.current) return;
    running.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    setRetryable(false);
    setProgress(0);
    let videoStage = true;
    try {
      if (!current.poster) {
        const { blob, durationSeconds } = await extractPoster(current.file);
        const fastStart = await isFastStart(current.file);
        if (!mounted.current) return;
        current.poster = new File([blob], 'poster.jpg', { type: 'image/jpeg' });
        if (preview.current) URL.revokeObjectURL(preview.current);
        preview.current = URL.createObjectURL(current.poster);
        setPosterPreview(preview.current);
        setWarnings([
          ...((bitrateMbps(current.file.size, durationSeconds) ?? 0) > BITRATE_WARNING_MBPS ? [text.bitrateWarning] : []),
          ...(fastStart === false ? [text.fastStartWarning] : []),
        ]);
      }
      const v = current.video;
      // Only an untransferred file needs a fresh signed URL. Lost completion responses reuse the original key.
      if (!v.uploaded && v.expiresAt !== null && Date.now() > v.expiresAt) {
        current.video = transfer<VideoIntent>();
        current.image = transfer<ImageIntent>();
      }
      const videoTransfer = current.video;
      if (!videoTransfer.intent) {
        const intent = await adminApi.videoIntent(vehicleId, current.file, videoTransfer.requestKey);
        videoTransfer.intent = intent;
        videoTransfer.expiresAt = Date.now() + (intent.expiresInSeconds - 60) * 1000;
        if (!mounted.current) return;
        select(intent.videoId);
      }
      if (!videoTransfer.uploaded) {
        await uploadFile(videoTransfer.intent.uploadUrl, current.file, (ratio) => {
          if (mounted.current) setProgress(ratio * 0.9);
        });
        videoTransfer.uploaded = true;
      }
      if (!mounted.current) return;
      if (!videoTransfer.completed) {
        await adminApi.completeVideo(vehicleId, videoTransfer.intent.videoId, videoTransfer.requestKey);
        videoTransfer.completed = true;
      }
      if (!mounted.current) return;
      videoStage = false;
      const i = current.image;
      if (!i.uploaded && i.expiresAt !== null && Date.now() > i.expiresAt) current.image = transfer<ImageIntent>();
      const imageTransfer = current.image;
      if (!imageTransfer.intent) {
        const intent = await adminApi.imageIntent(vehicleId, current.poster, imageTransfer.requestKey, true, { videoId: videoTransfer.intent.videoId });
        imageTransfer.intent = intent;
        imageTransfer.expiresAt = Date.now() + (intent.expiresInSeconds - 60) * 1000;
      }
      if (!mounted.current) return;
      if (!imageTransfer.uploaded) {
        await uploadFile(imageTransfer.intent.uploadUrl, current.poster, (ratio) => {
          if (mounted.current) setProgress(0.9 + ratio * 0.1);
        });
        imageTransfer.uploaded = true;
      }
      if (!mounted.current) return;
      if (!imageTransfer.completed) {
        await adminApi.completeImage(vehicleId, imageTransfer.intent.imageId, imageTransfer.requestKey);
        imageTransfer.completed = true;
      }
      if (!mounted.current) return;
      setProgress(1);
      // The editor refreshes the metadata and follows the poster through its existing polling loop.
      select(videoTransfer.intent.videoId);
    } catch (failure) {
      if (!mounted.current) return;
      const mapped = videoStage && failure instanceof ApiError && (failure.status === 413 || failure.status === 415)
        ? new ApiError(failure.status, { code: failure.status === 413 ? 'video_too_large' : 'video_wrong_type' }) : failure;
      setError(describeError(mapped));
      setRetryable(true);
    } finally {
      running.current = false;
      if (mounted.current) { setBusy(false); onBusyChange(false); }
    }
  }

  function choose(file: File) {
    if (disabled || running.current) return;
    if (file.type !== VIDEO_TYPE || file.size > MAX_VIDEO_BYTES) {
      setError(file.type !== VIDEO_TYPE ? text.wrongType : text.tooLarge);
      setRetryable(false);
      return;
    }
    const next: Upload = { file, poster: null, video: transfer<VideoIntent>(), image: transfer<ImageIntent>() };
    upload.current = next;
    setWarnings([]);
    void send(next);
  }

  function remove() {
    if (disabled || running.current) return;
    upload.current = null;
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
    setPosterPreview(null);
    setError(null);
    setWarnings([]);
    setRetryable(false);
    select(null);
    input.current?.focus();
  }

  return <div className="admin-photos">
    <p className="admin-field__hint">{text.coverNote}</p>
    <p className="admin-field__hint">{text.previewNote}</p>
    <p id="video-help" className="admin-field__hint">{text.help}</p>
    <input ref={input} type="file" accept={VIDEO_TYPE} aria-label={text.title} aria-describedby="video-help"
      disabled={disabled || busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) choose(file);
      }} />
    {video?.state === 'Ready' ? <video src={video.url} controls muted playsInline preload="metadata" aria-label={text.title} width={400} style={{ maxWidth: '100%' }} /> : null}
    {posterSrc ? <div className="admin-photo__media" style={{ maxWidth: 400 }}><img src={posterSrc} alt={text.coverNote} width={400} height={300} /></div> : null}
    {warnings.map((warning) => <p key={warning} className="admin-field__hint">{warning}</p>)}
    {busy ? <div role="status">
      <p>{adminCopy.photos.uploading(Math.round(progress * 100))}</p>
      <progress className="admin-photo__progress" max={1} value={progress} aria-label={text.title} />
    </div> : posterProcessing ? <p role="status">{adminCopy.photos.processing}</p> : null}
    {posterFailed ? <p className="admin-field__error" role="alert">{adminCopy.errors.codes.video_poster_failed}</p> : null}
    {error ? <p className="admin-field__error" role="alert">{error}</p> : null}
    <div className="admin-photo__actions">
      <button type="button" className="admin-action" disabled={disabled || busy} onClick={() => input.current?.click()}>{text.change}</button>
      {video || keep || retryable ? <button type="button" className="admin-action" disabled={disabled || busy} onClick={remove}>{text.remove}</button> : null}
      {retryable ? <button type="button" className="admin-action" disabled={disabled || busy}
        onClick={() => { if (upload.current) void send(upload.current); }}>{adminCopy.errors.retry}</button> : null}
    </div>
  </div>;
}
