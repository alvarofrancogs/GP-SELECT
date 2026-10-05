import type { SceneAsset } from '../assets/sceneAssets';
import { useLanguage } from '../i18n/useLanguage';

interface AssetSlotProps {
  asset: SceneAsset;
  label: string;
  className?: string;
  background?: boolean;
  /** 'high' for the first view (LCP); 'low' for scenes further down, so they never compete with it. */
  priority?: 'high' | 'low';
}

export function AssetSlot({ asset, label, className = '', background = false, priority }: AssetSlotProps) {
  const { copy } = useLanguage();

  return (
    <div className={`asset-slot ${background ? 'asset-slot--background' : 'asset-slot--media'} ${asset.temporary ? 'asset-slot--temporary' : ''} ${className}`}>
      <img src={asset.src} alt={asset.temporary || background ? '' : label} fetchPriority={priority} />
      {asset.temporary ? (
        <span className="asset-slot__caption">
          <span className="asset-slot__marker" aria-hidden="true" />
          <span>{label}<small>{copy.common.temporaryAsset}</small></span>
        </span>
      ) : null}
    </div>
  );
}
