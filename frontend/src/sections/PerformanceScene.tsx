import { ScrollScene } from '../components/ScrollScene';
import { useLanguage } from '../i18n/useLanguage';

export function PerformanceScene() {
  const { copy } = useLanguage();

  return (
    <ScrollScene id="criterio" kind="process" className="process-scene" labelledBy="process-title">
      <div className="scene-background process-background" data-scene-background />
      <div className="process-intro" data-scene-ui>
        <h2 id="process-title">{copy.process.title}</h2>
      </div>
      <ol className="process-words">
        {copy.process.steps.map((step, index) => (
          <li key={index} data-process-word>
            <span className="process-word">{step.word}</span>
            <span className="process-detail">
              <strong><span className="process-number" aria-hidden="true">0{index + 1}</span>{step.title}</strong>
              <span>{step.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </ScrollScene>
  );
}
