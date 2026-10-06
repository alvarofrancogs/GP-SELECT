import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { adminApi, uploadImage } from '../../services/adminApi';
import type { AdminImage } from '../../types/admin';
import { adminCopy } from '../../i18n/adminCopy';
import { describeError } from '../../lib/adminErrors';

const MAX_IMAGES = 30;
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A file on its way to the server. Once the server image is Ready or Failed, the server state takes over. */
interface Upload {
  key: string;
  file: File;
  preview: string;
  imageId: string | null;
  uploadUrl: string | null;
  /** When the signed upload URL stops working (ms since epoch); a retry after it asks for a new one. */
  expiresAt: number | null;
  phase: 'waiting' | 'uploading' | 'queued' | 'failed';
  progress: number;
  error: string | null;
}

interface ImageUploaderProps {
  vehicleId: string;
  images: AdminImage[];
  reload: () => Promise<void>;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  /** Local uploads not yet settled on the server: still in flight, or failed and waiting for retry or removal. */
  onPendingChange: (state: 'none' | 'working' | 'failed') => void;
  /** Uploads sent and completed, waiting for the server to process them: the only photos worth polling for. */
  onQueuedChange: (queued: boolean) => void;
  onImageAdded: (image: AdminImage) => void;
  onOrderChange: (ids: string[]) => void;
  onRemove: (id: string) => void;
}

export function ImageUploader({ vehicleId, images, reload, disabled, onBusyChange, onPendingChange, onQueuedChange, onImageAdded, onOrderChange, onRemove }: ImageUploaderProps) {
  const text = adminCopy.photos;
  const [uploads, setUploads] = useState<Upload[]>([]);
  const uploadsRef = useRef<Upload[]>([]);
  const running = useRef(false);
  const mounted = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLOListElement>(null);
  const [focusMove, setFocusMove] = useState<number | null>(null);
  const focusDir = useRef<'earlier' | 'later'>('later');
  const [rejected, setRejected] = useState<string[]>([]);
  const [live, setLive] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const commit = useCallback((next: Upload[]) => {
    uploadsRef.current = next;
    setUploads(next);
    onBusyChange(next.some((upload) => upload.phase === 'waiting' || upload.phase === 'uploading'));
    onPendingChange(next.some((upload) => upload.phase === 'failed') ? 'failed' : next.length ? 'working' : 'none');
    onQueuedChange(next.some((upload) => upload.phase === 'queued'));
  }, [onBusyChange, onPendingChange, onQueuedChange]);
  const patch = useCallback((key: string, changes: Partial<Upload>) => {
    commit(uploadsRef.current.map((u) => u.key === key ? { ...u, ...changes } : u));
  }, [commit]);

  const serverIds = new Set(images.map((image) => image.id));
  const pendingLocal = uploads.filter((u) => !u.imageId || !serverIds.has(u.imageId));
  const total = images.length + pendingLocal.filter((u) => u.phase !== 'failed' || u.imageId).length;
  const transferring = uploads.some((u) => u.phase === 'waiting' || u.phase === 'uploading');
  // Drop local copies once the server has the final state.
  useEffect(() => {
    const done = uploadsRef.current.filter((u) => (u.phase === 'queued' || u.phase === 'failed') && u.imageId
      && images.some((image) => image.id === u.imageId && (image.state === 'Ready' || image.state === 'Failed')));
    if (!done.length) return;
    done.forEach((u) => URL.revokeObjectURL(u.preview));
    commit(uploadsRef.current.filter((u) => !done.includes(u)));
    if (!uploadsRef.current.length) setLive(text.announceReady);
  }, [images, uploads, commit, text.announceReady]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.preview));
    };
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (let next = uploadsRef.current.find((u) => u.phase === 'waiting'); next && mounted.current; next = uploadsRef.current.find((u) => u.phase === 'waiting')) {
        const upload = next;
        patch(upload.key, { phase: 'uploading', progress: 0, error: null });
        try {
          let { imageId, uploadUrl } = upload;
          if (!imageId || !uploadUrl) {
            const intent = await adminApi.imageIntent(vehicleId, upload.file);
            ({ imageId, uploadUrl } = intent);
            // A minute of margin: the PUT of a large photo on a slow line can outlast the signature.
            patch(upload.key, { imageId, uploadUrl, expiresAt: Date.now() + (intent.expiresInSeconds - 60) * 1000 });
            onImageAdded({ id: imageId, state: 'PendingUpload', cardUrl: null, detailUrl: null,
              isCover: false, isStaged: true, sortOrder: 0, failureReason: null });
          }
          await uploadImage(uploadUrl, upload.file, (progress) => patch(upload.key, { progress }));
          await adminApi.completeImage(vehicleId, imageId);
          patch(upload.key, { phase: 'queued' });
          setLive(text.announceUploaded(upload.file.name));
          // The upload is complete; a failed refresh must not trigger another PUT.
          await reload().catch(() => { /* Polling retries and reports connection errors. */ });
        } catch (failure) {
          patch(upload.key, { phase: 'failed', error: describeError(failure) });
          setLive(`${upload.file.name}: ${describeError(failure)}`);
        }
      }
    } finally {
      running.current = false;
    }
  }, [patch, reload, vehicleId, text, onImageAdded]);

  function addFiles(files: FileList | File[]) {
    if (disabled) return;
    const accepted: Upload[] = [];
    const refused: string[] = [];
    let room = MAX_IMAGES - total;
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type)) refused.push(`${file.name}: ${text.badType}`);
      else if (file.size > MAX_BYTES) refused.push(`${file.name}: ${text.tooBig}`);
      else if (room <= 0) refused.push(`${file.name}: ${text.limit}`);
      else {
        room -= 1;
        accepted.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), imageId: null, uploadUrl: null, expiresAt: null, phase: 'waiting', progress: 0, error: null });
      }
    }
    setRejected(refused);
    if (!accepted.length) return;
    commit([...uploadsRef.current, ...accepted]);
    void pump();
  }

  function retry(upload: Upload) {
    // An expired signature would fail forever: start over with a new intent and drop the old pending photo.
    if (upload.expiresAt !== null && Date.now() > upload.expiresAt) {
      if (upload.imageId) onRemove(upload.imageId);
      patch(upload.key, { imageId: null, uploadUrl: null, expiresAt: null });
    }
    patch(upload.key, { phase: 'waiting', error: null });
    void pump();
  }

  function discard(upload: Upload) {
    if (upload.imageId) onRemove(upload.imageId);
    URL.revokeObjectURL(upload.preview);
    commit(uploadsRef.current.filter((u) => u.key !== upload.key));
  }

  const ordered = images;
  const coverId = ordered.find((image) => image.state === 'Ready')?.id;
  const canReorder = !disabled && !transferring && ordered.length > 1;

  function move(from: number, to: number, keepFocus = false) {
    if (!canReorder || from < 0 || to < 0 || to >= ordered.length || from === to) return;
    const ids = ordered.map((image) => image.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    onOrderChange(ids);
    setLive(text.moved(to + 1));
    if (keepFocus) { focusDir.current = to > from ? 'later' : 'earlier'; setFocusMove(to); }
  }

  // Keep keyboard focus on the moved photo.
  useEffect(() => {
    if (focusMove === null) return;
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>(`[data-move="${focusMove}"]`);
    // Prefer the button that keeps moving the same way; at either end, the other one.
    const enabled = Array.from(buttons ?? []).filter((button) => !button.disabled);
    (enabled.find((button) => button.dataset.dir === focusDir.current) ?? enabled[0])?.focus();
    setFocusMove(null);
  }, [focusMove]);

  function onDropZone(event: DragEvent) {
    event.preventDefault();
    setDropActive(false);
    if (!disabled && event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }
  const isFileDrag = (event: DragEvent) => event.dataTransfer.types.includes('Files');

  const byImage = new Map(uploads.filter((u) => u.imageId).map((u) => [u.imageId!, u]));
  return <div className="admin-photos">
    <div className="admin-photos__bar">
      <p className="admin-counter type-numeric" aria-label={`${total} de ${MAX_IMAGES} fotografías`}>{text.count(total)}</p>
      <p className="admin-field__hint">{text.orderHint}</p>
    </div>

    {disabled ? null : <div className="admin-dropzone" data-active={dropActive || undefined}
      onDragOver={(event) => { if (isFileDrag(event)) { event.preventDefault(); setDropActive(true); } }}
      onDragLeave={() => setDropActive(false)} onDrop={onDropZone}>
      <p className="type-ui">{text.drop}{' '}
        <button type="button" className="admin-link" onClick={() => input.current?.click()} disabled={total >= MAX_IMAGES}>{text.pick}</button>
      </p>
      <p className="admin-field__hint">{text.formats}</p>
      <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden
        onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
    </div>}

    {rejected.length ? <ul className="admin-photos__messages" role="alert">{rejected.map((line) => <li key={line}>{line}</li>)}</ul> : null}
    <p className="sr-only" role="status" aria-live="polite">{live}</p>

    {ordered.length || pendingLocal.length ? <ol className="admin-photos__grid" ref={grid}>
      {ordered.map((image, index) => {
        const local = byImage.get(image.id);
        const state = image.state === 'Ready' ? null
          : image.state === 'Failed' ? text.failed
          : image.state === 'Processing' ? text.processing
          : local ? (local.phase === 'queued' ? text.queued : local.phase === 'failed' ? local.error : text.uploading(Math.round(local.progress * 100)))
          : text.incomplete;
        const src = image.cardUrl ?? local?.preview ?? null;
        const label = text.photo(index + 1);
        return <li key={image.id} className="admin-photo" data-state={image.state} data-dragging={dragging === image.id || undefined}
          draggable={canReorder} onDragStart={(event) => { setDragging(image.id); event.dataTransfer.effectAllowed = 'move'; }}
          onDragEnd={() => setDragging(null)}
          onDragOver={(event) => { if (dragging) event.preventDefault(); }}
          onDrop={(event) => {
            if (!dragging) return;
            event.preventDefault();
            void move(ordered.findIndex((x) => x.id === dragging), index);
            setDragging(null);
          }}>
          <div className="admin-photo__media">
            {src ? <img src={src} alt={label} width={400} height={300} loading="lazy" decoding="async" /> : <span>{label}</span>}
          </div>
          <div className="admin-photo__line">
            <span className="type-numeric">{index + 1}</span>
            {image.id === coverId ? <strong>{text.cover}</strong> : null}
            {image.isStaged ? <span className="admin-photo__unsaved">{text.unsaved}</span> : null}
            {state ? <span className="admin-photo__state">{state}</span> : null}
            {!disabled && ordered.length > 1 ? <span className="admin-photo__move">
              <button type="button" className="admin-action admin-action--icon" disabled={!canReorder || index === 0}
                data-move={index} data-dir="earlier" aria-label={`${text.moveEarlier}, ${label}`} onClick={(event) => move(index, index - 1, event.detail === 0)}>←</button>
              <button type="button" className="admin-action admin-action--icon" disabled={!canReorder || index === ordered.length - 1}
                data-move={index} data-dir="later" aria-label={`${text.moveLater}, ${label}`} onClick={(event) => move(index, index + 1, event.detail === 0)}>→</button>
            </span> : null}
          </div>
          {image.state === 'Failed' ? <p className="admin-field__hint">{text.failedHint}</p> : null}
          {disabled ? null : <div className="admin-photo__actions">
            {image.state === 'Ready' && image.id !== coverId ? <button type="button" className="admin-action" disabled={!canReorder}
              onClick={() => move(index, 0)}>{text.makeCover}<span className="sr-only">, {label}</span></button> : null}
            {local?.phase === 'failed' ? <button type="button" className="admin-action"
              onClick={() => retry(local)}>{text.retry}</button> : null}
            <button type="button" className="admin-action" disabled={local?.phase === 'uploading' || local?.phase === 'waiting'}
              onClick={() => local ? discard(local) : onRemove(image.id)}>{text.remove}<span className="sr-only">, {label}</span></button>
          </div>}
        </li>;
      })}
      {pendingLocal.map((upload) => <li key={upload.key} className="admin-photo" data-state={upload.phase}>
        <div className="admin-photo__media"><img src={upload.preview} alt={upload.file.name} /></div>
        <div className="admin-photo__line">
          <span className="admin-photo__unsaved">{text.unsaved}</span>
          <span className="admin-photo__state">{upload.phase === 'failed' ? text.uploadFailed
            : upload.phase === 'waiting' ? text.queued : text.uploading(Math.round(upload.progress * 100))}</span>
        </div>
        {upload.phase === 'uploading' ? <progress className="admin-photo__progress" max={1} value={upload.progress} aria-label={upload.file.name} /> : null}
        {upload.phase === 'failed' && !disabled ? <>
          <p className="admin-field__error">{upload.error}</p>
          <div className="admin-photo__actions">
            <button type="button" className="admin-action" onClick={() => retry(upload)}>{text.retry}</button>
            <button type="button" className="admin-action" onClick={() => void discard(upload)}>{text.dismiss}</button>
          </div>
        </> : null}
      </li>)}
    </ol> : <p className="admin-empty-line">{text.empty}</p>}
  </div>;
}
