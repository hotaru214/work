import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * 打字机效果：将 text 按字符逐步显示。
 * - enabled=false 或用户偏好减少动画时，直接返回完整文本。
 * - 中文/英文按字符推进，速度随长度自适应，长文本更快。
 */
export function useTypewriter(text: string, enabled: boolean) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(enabled && !reduceMotion ? "" : text);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setDisplay(text);
      return;
    }

    const total = text.length;
    // 自适应速度：短文本慢一点更有质感，长文本整体控制在约 1.6s 内
    const duration = Math.min(1600, Math.max(500, total * 12));
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const count = Math.floor(progress * total);
      setDisplay(text.slice(0, count));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, enabled, reduceMotion]);

  const done = display.length >= text.length;
  return { display, done };
}
