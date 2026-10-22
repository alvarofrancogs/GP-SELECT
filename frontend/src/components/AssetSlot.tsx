import type { SceneAsset } from '../assets/sceneAssets';
import { useLanguage } from '../i18n/useLanguage';

interface AssetSlotProps {
  asset: SceneAsset;
  label: string;
  className?: string;
  background?: boolean;
  /** 'high' for the first view (LCP); 'low' for scenes further down: they load as the page nears them,
      so they never compete with it. Their boxes are sized by CSS, so a late image moves nothing. */
  priority?: 'high' | 'low';
}

export function AssetSlot({ asset, label, className = '', background = false, priority }: AssetSlotProps) {
  const { copy } = useLanguage();

  return (
    <div className={`asset-slot ${background ? 'asset-slot--background' : 'asset-slot--media'} ${asset.temporary ? 'asset-slot--temporary' : ''} ${className}`}>
      <picture>
        {asset.sources?.map((source) => (
          <source key={source.media} media={source.media} srcSet={source.srcSet ?? source.src} sizes={source.sizes} />
        ))}
        <img src={asset.src} srcSet={asset.srcSet} sizes={asset.sizes} alt={asset.temporary || background ? '' : label}
        fetchPriority={priority} loading={priority === 'low' ? 'lazy' : undefined} decoding={priority === 'low' ? 'async' : undefined} />
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
