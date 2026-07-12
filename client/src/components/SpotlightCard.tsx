import { useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 聚光半径（px） */
  radius?: number;
  /** 聚光颜色，默认中性深色柔光 */
  color?: string;
  className?: string;
}

/**
 * 鼠标跟随聚光灯卡片：光标移动时在卡片上渲染一片柔光，
 * 移出后淡出。纯 CSS 变量驱动，性能友好。
 */
export default function SpotlightCard({
  children,
  radius = 320,
  color = "rgba(15, 23, 42, 0.08)",
  className,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
