import { useLayoutEffect, useRef, useState } from 'react';
import type { SceneAsset } from '../assets/sceneAssets';
import { useLanguage } from '../i18n/useLanguage';

interface AssetSlotProps {
  asset: SceneAsset;
  label: string;
  className?: string;
  background?: boolean;
  /** 'high' for the first view (LCP); 'low' for scenes further down. */
  priority?: 'high' | 'low';
  /** Explicitly gated scenes load all their layers together once the hero has painted. */
  load?: boolean;
  /** Measure deferred car boxes, reserving resolution for their maximum animated scale. */
  responsiveScale?: number;
}

export function AssetSlot({ asset, label, className = '', background = false, priority, load, responsiveScale }: AssetSlotProps) {
  const { copy } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const [measuredSizes, setMeasuredSizes] = useState<string>();

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || responsiveScale === undefined) return;
    // clientWidth excludes the current GSAP transform: use the largest scale of the whole scene.
    const measure = () => {
      if (element.clientWidth) setMeasuredSizes(`${Math.ceil(element.clientWidth * responsiveScale)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [responsiveScale]);

  return (
    <div ref={root} className={`asset-slot ${background ? 'asset-slot--background' : 'asset-slot--media'} ${asset.temporary ? 'asset-slot--temporary' : ''} ${className}`}>
      <picture>
        {asset.sources?.map((source) => (
          <source key={source.media} media={source.media} srcSet={load === false ? undefined : source.srcSet ?? source.src} sizes={source.sizes} />
        ))}
        <img src={load === false ? undefined : asset.src} srcSet={load === false ? undefined : asset.srcSet} sizes={measuredSizes ?? asset.sizes} alt={asset.temporary || background ? '' : label}
        fetchPriority={priority} loading={priority === 'low' && load === undefined ? 'lazy' : undefined} decoding={priority === 'low' ? 'async' : undefined} />
      </picture>
      {asset.temporary ? (
        <span className="asset-slot__caption">
          <span className="asset-slot__marker" aria-hidden="true" />
          <span>{label}<small>{copy.common.temporaryAsset}</small></span>
        </span>
      ) : null}
    </div>
  );
}
