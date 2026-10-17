/** Phones and tablets re-rasterise blurred lettering on every scrubbed frame, and it flickers:
    there the scenes keep the same motion without the blur. */
export const TOUCH_MOTION = '(max-width: 1023px), (pointer: coarse)';

/** A blur for a scrubbed tween, or nothing on touch screens. */
export function blur(touch: boolean | undefined, px: number) {
  return touch ? {} : { filter: `blur(${px}px)` };
}
