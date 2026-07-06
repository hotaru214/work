import React, { useRef, useEffect, useId, useState } from 'react';
import './GooeyNav.css';

interface GooeyNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  activeIndex?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  labelClassName?: string;
  onItemClick?: (item: GooeyNavItem, index: number, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  activeIndex: activeIndexProp,
  orientation = 'horizontal',
  className = '',
  labelClassName = '',
  onItemClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const reactId = useId();
  const filterId = `gooey-nav-filter-${reactId.replace(/:/g, '')}`;
  const [internalActiveIndex, setInternalActiveIndex] = useState<number>(initialActiveIndex);
  const activeIndex = activeIndexProp ?? internalActiveIndex;

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const createEdgeParticle = (i: number, t: number, element: HTMLElement) => {
    const width = element.offsetWidth || 1;
    const height = element.offsetHeight || 1;
    const radius = 5.5;
    const perimeter = width * 2 + height * 2;
    const step = perimeter / particleCount;
    const edgeOffset = (i * step + step / 2 + noise(step * 0.45) + perimeter) % perimeter;
    const travel = 18 + Math.random() * 12;
    const outward = 2 + Math.random() * 5;
    const direction = Math.random() > 0.5 ? 1 : -1;

    let x = 0;
    let y = 0;
    let tx = 1;
    let ty = 0;
    let nx = 0;
    let ny = -1;

    if (edgeOffset < width) {
      x = edgeOffset;
      y = 0;
      tx = 1;
      ty = 0;
      nx = 0;
      ny = -1;
    } else if (edgeOffset < width + height) {
      x = width;
      y = edgeOffset - width;
      tx = 0;
      ty = 1;
      nx = 1;
      ny = 0;
    } else if (edgeOffset < width * 2 + height) {
      x = width - (edgeOffset - width - height);
      y = height;
      tx = -1;
      ty = 0;
      nx = 0;
      ny = 1;
    } else {
      x = 0;
      y = height - (edgeOffset - width * 2 - height);
      tx = 0;
      ty = -1;
      nx = -1;
      ny = 0;
    }

    return {
      origin: [x - radius, y - radius] as [number, number],
      start: [
        -tx * travel * 0.45 * direction + nx * outward * 0.35,
        -ty * travel * 0.45 * direction + ny * outward * 0.35
      ] as [number, number],
      end: [
        tx * travel * direction + nx * outward,
        ty * travel * direction + ny * outward
      ] as [number, number],
      time: t,
      scale: 0.65 + Math.random() * 0.45,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: noise(30)
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d: [number, number] = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    element.classList.remove('active');
    void element.offsetWidth;
    requestAnimationFrame(() => {
      element.classList.add('active');
    });

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = orientation === 'vertical' ? createEdgeParticle(i, t, element) : createParticle(i, t, d, r);

      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        const edgeOrigin = 'origin' in p && Array.isArray(p.origin) ? p.origin : null;
        if (edgeOrigin) {
          particle.style.setProperty('--origin-x', `${edgeOrigin[0]}px`);
          particle.style.setProperty('--origin-y', `${edgeOrigin[1]}px`);
        }
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);

        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            // Do nothing
          }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const runEffect = (element: HTMLElement, index: number) => {
    if (activeIndexProp === undefined) {
      setInternalActiveIndex(index);
    }

    updateEffectPosition(element);

    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => filterRef.current!.removeChild(p));
    }

    if (textRef.current) {
      textRef.current.classList.remove('active');

      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }

    if (filterRef.current) {
      makeParticles(filterRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: GooeyNavItem, index: number) => {
    if (onItemClick) {
      e.preventDefault();
    }

    if (activeIndex !== index) {
      runEffect(e.currentTarget, index);
    }

    onItemClick?.(item, index, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex !== index) {
        runEffect(e.currentTarget, index);
      }
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLink = navRef.current.querySelectorAll('a')[activeIndex] as HTMLElement;
    if (activeLink) {
      updateEffectPosition(activeLink);
      textRef.current?.classList.add('active');
      filterRef.current?.classList.add('active');
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLink = navRef.current?.querySelectorAll('a')[activeIndex] as HTMLElement;
      if (currentActiveLink) {
        updateEffectPosition(currentActiveLink);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  return (
    <div className={`gooey-nav-container gooey-nav-${orientation} ${className}`} ref={containerRef}>
      {orientation === 'vertical' && (
        <svg className="gooey-nav-filter-svg" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      )}
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? 'active' : ''}>
              <a href={item.href} title={item.label} onClick={e => handleClick(e, item, index)} onKeyDown={e => handleKeyDown(e, index)}>
                {item.icon && <span className="gooey-nav-icon">{item.icon}</span>}
                <span className={`gooey-nav-label ${labelClassName}`}>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} style={orientation === 'vertical' ? { filter: `url(#${filterId})` } : undefined} />
      <span className="effect text" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
