import { sceneAssets } from '../assets/sceneAssets';
import { AssetSlot } from '../components/AssetSlot';
import { Button } from '../components/Button';
import { useCarHandoffScene } from '../hooks/useCarHandoffScene';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/car-handoff.css';

type HandoffState = { left: string; right: string; description: string };
// Each state places its lettering differently: around the car, stacked in one lane, or stacked in the other.
type Layout = 'split' | 'left' | 'right';

function HandoffText({ state, name, layout, titleId }: { state: HandoffState; name: string; layout: Layout; titleId?: string }) {
  const Heading = titleId ? 'h2' : 'h3';
  return (
    <div className="car-handoff__text" data-text={name} data-layout={layout}>
      {/* Same classes as the hero headline: one type recipe, sizes fitted per word. */}
      <Heading id={titleId} className="scene-title hero-title" data-headline>
        <span data-word><span data-line>{state.left}</span></span>
        <span data-word><span data-line>{state.right}</span></span>
      </Heading>
      <p className="scene-description hero-description" data-line>{state.description}</p>
    </div>
  );
}

function CarCaption({ name, note, car }: { name: string; note: string; car: string }) {
  return (
    <p className="car-handoff__caption" data-caption={car}>
      <span>{name}</span>
      <small>{note}</small>
    </p>
  );
}

/** The BMW seen from above drives in and parks; a soft curtain turns it into its mechanical cutaway
    while the weather closes in, then the scene leaves with the page. */
export function CarHandoffScene() {
  const { copy } = useLanguage();
  const text = copy.carHandoff;
  const { sectionRef, pinRef } = useCarHandoffScene();
  const [stateA, stateB, stateC] = text.states;

  return (
    <section id="coches" ref={sectionRef} className="car-handoff" aria-labelledby="car-handoff-title">
      <div ref={pinRef} className="car-handoff__pin" data-handoff-target="process">
        <div className="car-handoff__panel">
          <div className="car-handoff__world" data-handoff-world>
            <AssetSlot asset={sceneAssets.handoffBright} label={copy.common.backgroundAsset} background />
            <div className="car-handoff__overcast" data-handoff-overcast>
              <AssetSlot asset={sceneAssets.handoffOvercast} label={copy.common.backgroundAsset} background />
            </div>
          </div>
          {/* The first headline sits under the car, so the car drives over it. */}
          <HandoffText state={stateA} name="a" layout="split" titleId="car-handoff-title" />
          {/* One car, two views on the same footprint: the cutaway waits under the photograph,
              and a soft curtain lifts the photograph off from tail to nose. */}
          <div className="car-handoff__car" data-car>
            <div className="car-handoff__layer">
              <AssetSlot asset={sceneAssets.carCutaway} label={text.carCutaway} />
            </div>
            <div className="car-handoff__layer car-handoff__photo" data-car-photo>
              <AssetSlot asset={sceneAssets.carA} label={text.carA} />
            </div>
            <CarCaption {...text.captions[0]} car="a" />
            <CarCaption {...text.captions[1]} car="b" />
          </div>
        </div>
        <div className="car-handoff__panel car-handoff__panel--overcast">
          <div className="car-handoff__world car-handoff__world--static" aria-hidden="true">
            <AssetSlot asset={sceneAssets.handoffOvercast} label={copy.common.backgroundAsset} background />
          </div>
          <div className="car-handoff__car car-handoff__car--static" aria-hidden="true">
            <div className="car-handoff__layer">
              <AssetSlot asset={sceneAssets.carCutaway} label="" />
            </div>
          </div>
          <HandoffText state={stateB} name="b" layout="left" />
          <p className="car-handoff__interlude" data-text="interlude"><span data-line>{text.interlude}</span></p>
          <HandoffText state={stateC} name="c" layout="right" />
        </div>
        {/* One light over world and cars, so the weather changes the car too. */}
        <div className="car-handoff__grade" data-handoff-grade aria-hidden="true" />
        <div className="car-handoff__cta" data-handoff-cta>
          <Button to="/vehiculos" variant="light">{text.cta}</Button>
        </div>
      </div>
    </section>
  );
}
