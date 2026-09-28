import { ScrollScene } from '../components/ScrollScene';
import { useLanguage } from '../i18n/useLanguage';

export function PerformanceScene() {
  const { copy } = useLanguage();

  return (
    <ScrollScene id="criterio" kind="process" className="process-scene" labelledBy="process-title">
      <div className="scene-background process-background" data-scene-background />
      <div className="process-intro" data-scene-ui>
        <span className="eyebrow">{copy.process.eyebrow}</span>
        <h2 id="process-title">{copy.process.title}</h2>
      </div>
      <ol className="process-words">
        {copy.process.steps.map((step, index) => (
          <li key={index} data-process-word>
            <span className="process-number" aria-hidden="true">0{index + 1}</span>
            <span className="process-word">{step.word}</span>
            <span className="process-detail"><strong>{step.title}</strong><span>{step.description}</span></span>
          </li>
        ))}
      </ol>
      <p className="process-footer" data-scene-ui>{copy.process.footer}</p>
      <div className="scene-handoff scene-handoff--light" data-scene-handoff aria-hidden="true" />
    </ScrollScene>
  );
}
