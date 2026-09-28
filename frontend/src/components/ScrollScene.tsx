import type { ReactNode } from 'react';
import { useGsapScene, type SceneKind } from '../hooks/useGsapScene';

type ScrollSceneProps = {
  id: string;
  kind: SceneKind;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
};

export function ScrollScene({ id, kind, className = '', children, labelledBy }: ScrollSceneProps) {
  const { sectionRef, pinRef } = useGsapScene(kind, id);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`scroll-scene ${className}`.trim()}
      data-scene={kind}
      aria-labelledby={labelledBy}
    >
      <div ref={pinRef} className="scroll-scene__pin" data-scene-pin>
        {children}
      </div>
    </section>
  );
}
