import { sceneAssets } from '../assets/sceneAssets';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { useCarHandoffScene } from '../hooks/useCarHandoffScene';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/car-handoff.css';

type HandoffState = { left: string; right: string; description: string };

function HandoffText({ state, name, titleId }: { state: HandoffState; name: string; titleId?: string }) {
  const Heading = titleId ? 'h2' : 'h3';
  return (
    <div className="car-handoff__text" data-text={name}>
      {/* Same classes as the hero headline: one type recipe, sizes fitted per word. */}
      <Heading id={titleId} className="scene-title hero-title" data-headline>
        <span data-word><span data-line>{state.left}</span></span>
        <span data-word><span data-line>{state.right}</span></span>
      </Heading>
      <p className="scene-description hero-description" data-line>{state.description}</p>
    </div>
  );
}

/** BMW → dark map curtain → RS Q3, in one pinned frame. */
export function CarHandoffScene() {
  const { copy } = useLanguage();
  const text = copy.carHandoff;
  const { sectionRef, pinRef } = useCarHandoffScene();
  const [stateA, stateB, stateC] = text.states;

  return (
    <section id="coches" ref={sectionRef} className="car-handoff" aria-labelledby="car-handoff-title">
      <div ref={pinRef} className="car-handoff__pin" data-handoff-target="process">
        <div className="car-handoff__panel">
          <div className="scene-background">
            <AssetSlot asset={sceneAssets.heroBackground} label={copy.common.backgroundAsset} background />
          </div>
          <div className="car-handoff__shade" data-handoff-shade aria-hidden="true" />
          <div className="car-handoff__car" data-car="a">
            <AssetSlot asset={sceneAssets.carA} label={text.carA} />
          </div>
          <HandoffText state={stateA} name="a" titleId="car-handoff-title" />
        </div>
        <div className="car-handoff__panel car-handoff__panel--dark">
          <div className="car-handoff__night" data-handoff-night>
            <div className="car-handoff__map" data-handoff-map>
              <AssetSlot asset={sceneAssets.map} label={text.map} />
            </div>
          </div>
          <div className="car-handoff__car" data-car="b">
            <AssetSlot asset={sceneAssets.carB} label={text.carB} />
          </div>
          <HandoffText state={stateB} name="b" />
          <HandoffText state={stateC} name="c" />
        </div>
        <div className="car-handoff__cta" data-handoff-cta>
          <Button to="/vehiculos" variant="light">{text.cta}</Button>
        </div>
      </div>
    </section>
  );
}
