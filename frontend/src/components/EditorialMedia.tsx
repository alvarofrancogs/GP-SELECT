import type { SceneAsset } from '../assets/sceneAssets';
import { useLanguage } from '../i18n/useLanguage';

interface EditorialMediaProps {
  asset: SceneAsset;
  label: string;
  portrait?: boolean;
}

export function EditorialMedia({ asset, label, portrait = false }: EditorialMediaProps) {
  const { copy } = useLanguage();
  return (
    <figure className={`editorial-media${portrait ? ' editorial-media--portrait' : ''}`}>
      <img src={asset.src} alt={asset.temporary ? '' : label} width={portrait ? 900 : 1400}
        height={portrait ? 1100 : 900} loading="lazy" decoding="async" />
      {asset.temporary ? <figcaption className="type-ui">{label}<span>{copy.common.temporaryAsset}</span></figcaption> : null}
    </figure>
  );
}
