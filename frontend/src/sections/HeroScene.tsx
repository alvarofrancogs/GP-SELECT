import { sceneAssets } from '../assets/sceneAssets';
import { AssetSlot } from '../components/AssetSlot';
import { ScrollScene } from '../components/ScrollScene';
import { useLanguage } from '../i18n/useLanguage';

export function HeroScene() {
  const { copy } = useLanguage();

  return (
    <ScrollScene id="hero" kind="hero" className="hero-scene" labelledBy="hero-title">
      <div className="hero-wall" aria-hidden="true">
        <AssetSlot asset={sceneAssets.heroBackground} label={copy.common.backgroundAsset} background priority="high" />
      </div>
      <div className="hero-floor" aria-hidden="true">
        <AssetSlot asset={sceneAssets.heroFloor} label="" background priority="high" />
      </div>
      <h1 id="hero-title" className="scene-title hero-title">
        {/* The space keeps the words apart in the heading's text (search engines, screen readers); flex hides it. */}
        <span data-scene-title>{copy.hero.left}</span>{' '}
        <span data-scene-title>{copy.hero.right}</span>
      </h1>
      <p className="scene-description hero-description" data-scene-ui>{copy.hero.description}</p>
      <div className="hero-media" data-scene-media>
        <div className="hero-contact-shadow" aria-hidden="true">
          <AssetSlot asset={sceneAssets.heroShadow} label="" priority="high" />
        </div>
        <AssetSlot asset={sceneAssets.heroCar} label={copy.common.heroAsset} priority="high" />
        <div className="hero-wheel hero-wheel--front" aria-hidden="true">
          <div className="hero-wheel__rotor" data-hero-wheel>
            <AssetSlot asset={sceneAssets.heroWheel} label="" priority="high" />
          </div>
        </div>
        <div className="hero-wheel hero-wheel--rear" aria-hidden="true">
          <div className="hero-wheel__rotor" data-hero-wheel>
            <AssetSlot asset={sceneAssets.heroWheel} label="" priority="high" />
          </div>
        </div>
      </div>
      <div className="scene-handoff hero-handoff" data-scene-handoff aria-hidden="true" />
    </ScrollScene>
  );
}
