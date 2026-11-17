'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '@/data/content';
import { projectBus } from '@/lib/scene/project-bus';

const PHONE_QUERY = '(max-width: 760px), (max-aspect-ratio: 9/10)';

/**
 * Picking a project plays it on the monitor: hover, focus or click on desktop,
 * and on phones whichever card is centred in the swipe rail.
 */
export default function ProjectList({ projects }: { projects: Project[] }) {
  const [current, setCurrent] = useState(projectBus.get());
  const listRef = useRef<HTMLUListElement>(null);

  const select = useCallback((i: number) => {
    setCurrent(i);
    projectBus.set(i);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const phoneQ = window.matchMedia(PHONE_QUERY);
    const io = new IntersectionObserver(
      (entries) => {
        if (!phoneQ.matches) return;
        for (const en of entries) if (en.isIntersecting) select(Number((en.target as HTMLElement).dataset.i));
      },
      { root: list, threshold: 0.75 },
    );
    list.querySelectorAll('.proj').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [select]);

  const hoverable = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(projects.length - 1, current + step));
    (listRef.current?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <ul className="projects" role="listbox" aria-label="Projects" ref={listRef} onKeyDown={onKeyDown}>
      {projects.map((p, i) => {
        const variant = p.featured ? 'feature' : i >= 2 ? `compact${i === 2 ? ' first-compact' : ''}` : '';
        return (
          <li
            key={p.key}
            className={`proj ${variant}`}
            role="option"
            tabIndex={0}
            data-i={i}
            aria-selected={i === current}
            onPointerEnter={() => hoverable() && select(i)}
            onFocus={() => select(i)}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('a')) select(i);
            }}
          >
            <div className="proj-head">
              <span className="proj-title">
                {p.title}
                <span className="on-screen" aria-hidden="true" />
              </span>
              <span className="proj-kind">{p.featured ? p.domain : p.kind}</span>
            </div>
            {p.featured && <p className="proj-kind">{p.kind}</p>}
            <p className="proj-blurb">{p.blurb}</p>
            {p.points && (
              <ul className="proj-points">
                {p.points.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <div className="proj-meta">
              <span>{p.tech.join(', ')}</span>
              <a className="proj-link" href={p.href} target="_blank" rel="noopener noreferrer">
                {p.linkLabel ?? `Open ${p.title}`}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
