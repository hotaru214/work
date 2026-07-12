import { AnimatedCircularProgressBar } from "./ui/animated-circular-progress-bar";

interface ProgressRingProps {
  value: number;
  max?: number;
  className?: string;
}

/**
 * 黑白灰主基调的环形进度：深色主轨 + 浅灰底轨。
 * 封装 AnimatedCircularProgressBar，固定中性配色，避免逐处传色值。
 */
export default function ProgressRing({ value, max = 100, className }: ProgressRingProps) {
  return (
    <AnimatedCircularProgressBar
      value={value}
      max={max}
      min={0}
      gaugePrimaryColor="rgb(15 23 42)"
      gaugeSecondaryColor="rgb(226 232 240)"
      className={className}
    />
  );
}
