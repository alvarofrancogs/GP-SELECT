import { sceneAssets } from '../assets/sceneAssets';
import { AssetSlot } from '../components/AssetSlot';
import { ScrollScene } from '../components/ScrollScene';
import { useLanguage } from '../i18n/useLanguage';

export function HeroScene() {
  const { copy } = useLanguage();

  return (
    <ScrollScene id="hero" kind="hero" className="hero-scene" labelledBy="hero-title">
      <div className="scene-background" data-scene-background>
        <AssetSlot asset={sceneAssets.heroBackground} label={copy.common.backgroundAsset} background />
      </div>
      <h1 id="hero-title" className="scene-title hero-title">
        <span data-scene-title>{copy.hero.left}</span>
        <span data-scene-title>{copy.hero.right}</span>
      </h1>
      <p className="scene-description hero-description" data-scene-ui>{copy.hero.description}</p>
      <div className="hero-media" data-scene-media>
        <AssetSlot asset={sceneAssets.heroCar} label={copy.common.heroAsset} />
      </div>
      <div className="scene-handoff hero-handoff" data-scene-handoff aria-hidden="true" />
    </ScrollScene>
  );
}
