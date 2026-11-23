import { motion } from "framer-motion";
import { useId } from "react";

export type Mood = "neutral" | "happy" | "sad" | "smug" | "shocked" | "dizzy";

type Props = {
  variant: "sober" | "drunk";
  mood?: Mood;
  /** 얼굴이 바라보는 방향 */
  facing?: "left" | "right";
  size?: number;
  animate?: boolean;
};

const PALETTE = {
  sober: { a: "#7CC8FF", b: "#1660C9", hair: "#0B1F44", body: "#123A7A", accent: "#3DA9FF" },
  drunk: { a: "#FFC09A", b: "#E0662A", hair: "#3A1606", body: "#7A2E0E", accent: "#FF8A3D" },
};

function Eyes({ mood, dx }: { mood: Mood; dx: number }) {
  const L = 46 + dx;
  const R = 74 + dx;
  const y = 62;
  const stroke = { stroke: "#0A0F1E", strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
      return (
        <g {...stroke}>
          <path d={`M${L - 6} ${y + 2} Q${L} ${y - 6} ${L + 6} ${y + 2}`} />
          <path d={`M${R - 6} ${y + 2} Q${R} ${y - 6} ${R + 6} ${y + 2}`} />
        </g>
      );
    case "smug":
      return (
        <g>
          <path d={`M${L - 7} ${y - 1} L${L + 7} ${y - 1}`} {...stroke} />
          <path d={`M${R - 7} ${y - 1} L${R + 7} ${y - 1}`} {...stroke} />
          <circle cx={L + 2} cy={y + 2.5} r={2.6} fill="#0A0F1E" />
          <circle cx={R + 2} cy={y + 2.5} r={2.6} fill="#0A0F1E" />
        </g>
      );
    case "shocked":
      return (
        <g>
          <circle cx={L} cy={y} r={6.5} fill="#fff" stroke="#0A0F1E" strokeWidth={2.5} />
          <circle cx={R} cy={y} r={6.5} fill="#fff" stroke="#0A0F1E" strokeWidth={2.5} />
          <circle cx={L} cy={y} r={2.4} fill="#0A0F1E" />
          <circle cx={R} cy={y} r={2.4} fill="#0A0F1E" />
        </g>
      );
    case "dizzy":
      return (
        <g {...stroke} strokeWidth={2.6}>
          {[L, R].map((cx) => (
            <path key={cx} d={`M${cx} ${y} m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -5 0 a5 5 0 1 1 9 0 a6.5 6.5 0 1 1 -12 1`} />
          ))}
        </g>
      );
    case "sad":
      return (
        <g>
          <ellipse cx={L} cy={y + 2} rx={3.4} ry={4.2} fill="#0A0F1E" />
          <ellipse cx={R} cy={y + 2} rx={3.4} ry={4.2} fill="#0A0F1E" />
          <path d={`M${L - 7} ${y - 9} L${L + 5} ${y - 6}`} {...stroke} strokeWidth={2.6} />
          <path d={`M${R + 7} ${y - 9} L${R - 5} ${y - 6}`} {...stroke} strokeWidth={2.6} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={L} cy={y} rx={3.6} ry={4.6} fill="#0A0F1E" />
          <ellipse cx={R} cy={y} rx={3.6} ry={4.6} fill="#0A0F1E" />
          <circle cx={L + 1.3} cy={y - 1.6} r={1.2} fill="#fff" />
          <circle cx={R + 1.3} cy={y - 1.6} r={1.2} fill="#fff" />
        </g>
      );
  }
}

function Mouth({ mood, dx }: { mood: Mood; dx: number }) {
  const cx = 60 + dx;
  const y = 82;
  const s = { stroke: "#0A0F1E", strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "happy":
      return <path d={`M${cx - 10} ${y - 2} Q${cx} ${y + 12} ${cx + 10} ${y - 2} Z`} fill="#0A0F1E" stroke="#0A0F1E" strokeWidth={2} strokeLinejoin="round" />;
    case "sad":
      return <path d={`M${cx - 8} ${y + 4} Q${cx} ${y - 4} ${cx + 8} ${y + 4}`} {...s} />;
    case "smug":
      return <path d={`M${cx - 8} ${y + 1} Q${cx + 2} ${y + 5} ${cx + 10} ${y - 4}`} {...s} />;
    case "shocked":
      return <ellipse cx={cx} cy={y + 1} rx={4.5} ry={6} fill="#0A0F1E" />;
    case "dizzy":
      return <path d={`M${cx - 11} ${y} q3 -4 5.5 0 t5.5 0 t5.5 0 t5.5 0`} {...s} strokeWidth={2.8} />;
    default:
      return <path d={`M${cx - 7} ${y} Q${cx} ${y + 6} ${cx + 7} ${y}`} {...s} />;
  }
}

export function Character({ variant, mood = "neutral", facing = "right", size = 120, animate = true }: Props) {
  const uid = useId().replace(/:/g, "");
  const c = PALETTE[variant];
  const dx = facing === "right" ? 4 : -4;
  const isDrunk = variant === "drunk";

  const motionProps = animate
    ? isDrunk
      ? { animate: { rotate: [-6, 4, -6], y: [0, -3, 0] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } }
      : { animate: { y: [0, -4, 0] }, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const } }
    : {};

  return (
    <motion.svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      style={{ originX: "50%", originY: "90%", overflow: "visible" }}
      {...motionProps}
      aria-label={isDrunk ? "취한 나 캐릭터" : "맨정신 캐릭터"}
      role="img"
    >
      <defs>
        <radialGradient id={`face-${uid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={c.a} />
          <stop offset="100%" stopColor={c.b} />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 바닥 그림자 */}
      <ellipse cx="60" cy="134" rx="34" ry="5" fill="#000" opacity="0.35" />

      {/* 몸 (후디) */}
      <path d="M22 136 Q24 100 60 98 Q96 100 98 136 Z" fill={c.body} />
      <path d="M48 100 L60 116 L72 100" fill="none" stroke={c.accent} strokeWidth="3" strokeLinecap="round" opacity="0.8" />

      {/* 머리 */}
      <g filter={`url(#glow-${uid})`}>
        <circle cx="60" cy="62" r="40" fill={`url(#face-${uid})`} />
      </g>

      {/* 머리카락 */}
      {isDrunk ? (
        <path d="M22 54 Q22 20 58 20 Q70 14 80 22 Q100 26 98 52 Q90 40 82 44 Q78 34 66 38 Q60 30 50 38 Q40 34 36 44 Q28 42 22 54 Z" fill={c.hair} />
      ) : (
        <path d="M21 56 Q20 22 60 21 Q98 22 99 52 Q86 36 64 38 Q46 30 34 42 Q26 46 21 56 Z" fill={c.hair} />
      )}

      {/* 볼터치 */}
      {isDrunk ? (
        <g opacity="0.9">
          <ellipse cx={40 + dx} cy="76" rx="9" ry="5.5" fill="#FF3D6E" opacity="0.55" />
          <ellipse cx={80 + dx} cy="76" rx="9" ry="5.5" fill="#FF3D6E" opacity="0.55" />
        </g>
      ) : (
        <g opacity="0.35">
          <ellipse cx={40 + dx} cy="76" rx="6" ry="3.5" fill="#fff" />
          <ellipse cx={80 + dx} cy="76" rx="6" ry="3.5" fill="#fff" />
        </g>
      )}

      <Eyes mood={mood} dx={dx} />

      {/* 맨정신: 안경 + 자신감 눈썹 */}
      {!isDrunk && (
        <g fill="none" stroke="#0A0F1E" strokeWidth="2.6">
          <rect x={35 + dx} y="52" width="22" height="18" rx="6" fill="rgba(255,255,255,0.12)" />
          <rect x={63 + dx} y="52" width="22" height="18" rx="6" fill="rgba(255,255,255,0.12)" />
          <path d={`M${57 + dx} 60 L${63 + dx} 60`} />
          {mood !== "sad" && (
            <>
              <path d={`M${37 + dx} 46 Q${46 + dx} 41 ${55 + dx} 45`} strokeLinecap="round" strokeWidth="3" />
              <path d={`M${65 + dx} 44 Q${74 + dx} 39 ${83 + dx} 44`} strokeLinecap="round" strokeWidth="3" />
            </>
          )}
        </g>
      )}

      <Mouth mood={mood} dx={dx} />

      {/* 취한 나: 딸꾹 거품 */}
      {isDrunk && (
        <motion.g
          animate={animate ? { opacity: [0, 1, 0], y: [4, -6, -12] } : undefined}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        >
          <circle cx={facing === "left" ? 18 : 102} cy="28" r="5" fill="none" stroke={c.a} strokeWidth="2" />
          <circle cx={facing === "left" ? 10 : 110} cy="16" r="3" fill="none" stroke={c.a} strokeWidth="1.6" />
        </motion.g>
      )}

      {/* 맨정신: 반짝 */}
      {!isDrunk && mood !== "sad" && mood !== "shocked" && (
        <motion.path
          d={`M${facing === "right" ? 100 : 20} 22 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z`}
          fill="#fff"
          animate={animate ? { opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
    </motion.svg>
  );
}
