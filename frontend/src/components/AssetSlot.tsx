import type { SceneAsset } from '../assets/sceneAssets';
import { useLanguage } from '../i18n/useLanguage';

interface AssetSlotProps {
  asset: SceneAsset;
  label: string;
  className?: string;
  background?: boolean;
}

export function AssetSlot({ asset, label, className = '', background = false }: AssetSlotProps) {
  const { copy } = useLanguage();

  return (
    <div className={`asset-slot ${background ? 'asset-slot--background' : 'asset-slot--media'} ${asset.temporary ? 'asset-slot--temporary' : ''} ${className}`}>
      <img src={asset.src} alt={asset.temporary || background ? '' : label} />
      {asset.temporary ? (
        <span className="asset-slot__caption">
          <span className="asset-slot__marker" aria-hidden="true" />
          <span>{label}<small>{copy.common.temporaryAsset}</small></span>
        </span>
      ) : null}
    </div>
  );
}
