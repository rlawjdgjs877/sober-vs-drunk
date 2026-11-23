import { forwardRef, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { Character, type Mood } from "./Character";
import { Button } from "./ui/button";
import type { GameCompare, Overall } from "@/lib/stats";
import type { SessionRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { drinkLabel, feelingLabel } from "./DrinkForm";

type CardProps = {
  record: SessionRecord;
  games: GameCompare[];
  overall: Overall;
  headline: string;
  soberMood: Mood;
  nowMood: Mood;
};

const statusColor = { better: "#34D399", worse: "#F87171", same: "#8B93B0" };
const statusArrow = { better: "▲", worse: "▼", same: "＝" };

/** 친구에게 공유하기 좋은 세로형(9:16) 결과 카드 */
export const ShareCardView = forwardRef<HTMLDivElement, CardProps>(({ record, games, overall, headline, soberMood, nowMood }, ref) => {
  const score = `${games.filter((g) => g.outcome === "lose").length} : ${games.filter((g) => g.outcome === "win").length}`;
  return (
    <div
      ref={ref}
      style={{ width: 360, height: 640, fontFamily: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}
      className="relative flex flex-col overflow-hidden rounded-[28px] bg-[#070B17] p-6 text-white"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#3DA9FF]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#FF8A3D]/25 blur-3xl" />

      <div className="relative text-center">
        <div className="text-[10px] font-bold tracking-[0.3em] text-[#8B93B0]">SOBER VS DRUNK</div>
        <div className="mt-1 text-[11px] text-[#8B93B0]">{formatDate(record.createdAt)}</div>
      </div>

      <div className="relative mt-3 flex items-end justify-center gap-1">
        <div className="flex flex-col items-center">
          <Character variant="sober" mood={soberMood} facing="right" size={96} animate={false} />
          <span className="mt-1 rounded-full bg-[#3DA9FF]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#3DA9FF]">맨정신의 나</span>
        </div>
        <div className="mb-12 flex flex-col items-center">
          <span className="text-gradient-vs text-4xl font-black italic">VS</span>
          <span className="mt-1 text-lg font-black">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          <Character variant="drunk" mood={nowMood} facing="left" size={96} animate={false} />
          <span className="mt-1 rounded-full bg-[#FF8A3D]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#FF8A3D]">지금의 나</span>
        </div>
      </div>

      <div className="relative mt-4 text-center">
        <div
          className="inline-block rounded-full px-3 py-1 text-xs font-black"
          style={{ background: overall === "lose" ? "#F8717133" : overall === "win" ? "#34D39933" : "#8B93B033", color: overall === "lose" ? "#F87171" : overall === "win" ? "#34D399" : "#C4CAE0" }}
        >
          지금의 나 {overall === "lose" ? "패배" : overall === "win" ? "승리" : "무승부"}
        </div>
        <div className="mt-2 text-[17px] font-extrabold leading-snug">{headline}</div>
      </div>

      <div className="relative mt-4 space-y-2">
        {games.map((g) => (
          <div key={g.game} className="rounded-2xl bg-white/[0.06] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{g.title}</span>
              <span className="text-[11px] font-bold" style={{ color: statusColor[g.headline.status] }}>
                {statusArrow[g.headline.status]} {g.headline.changeText}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-[#3DA9FF]">맨정신 {g.headline.soberText}</span>
              <span className="text-[#FF8A3D]">지금 {g.headline.nowText}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-3 text-center text-[11px] text-[#8B93B0]">
        {record.drink?.drank
          ? `${drinkLabel(record.drink.type)} ${record.drink.volumeMl}mL · ${record.drink.abv}% · 느낌: ${feelingLabel(record.drink.feeling)}`
          : "오늘은 술 없이 측정"}
      </div>

      <div className="relative mt-auto rounded-xl bg-white/5 px-3 py-2 text-center text-[10px] leading-relaxed text-[#8B93B0]">
        평소 대비 변화를 보는 게임 기록이며 의학적 판정이 아니에요.
        <br />
        <b className="text-white/80">결과와 관계없이 음주 후 운전은 절대 금지!</b>
      </div>
    </div>
  );
});
ShareCardView.displayName = "ShareCardView";

async function renderPng(node: HTMLElement) {
  const opts = { pixelRatio: 3, cacheBust: true, backgroundColor: "#070B17" };
  try {
    return await toPng(node, opts);
  } catch {
    // 외부 폰트 CSS를 읽지 못하는 환경에서는 폰트 임베드 없이 다시 시도
    return await toPng(node, { ...opts, skipFonts: true });
  }
}

export function ShareCardModal({ open, onClose, ...props }: CardProps & { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileName = `sober-vs-drunk-${props.record.createdAt.slice(0, 10)}.png`;

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await renderPng(ref.current);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setMsg("이미지를 저장했어요!");
    } catch {
      setMsg("이미지 생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!ref.current) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await renderPng(ref.current);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "맨정신 VS 취한 나", text: props.headline });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setMsg("이 브라우저는 바로 공유를 지원하지 않아 이미지로 저장했어요.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("공유에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="flex max-h-full flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex w-[310px] items-center justify-between sm:w-[360px]">
              <span className="text-sm font-bold">공유용 결과 카드</span>
              <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="닫기">
                <X size={20} />
              </button>
            </div>
            <div className="h-[551px] w-[310px] shrink-0 sm:h-[640px] sm:w-[360px]">
              <div className="origin-top-left scale-[0.86] sm:scale-100">
                <ShareCardView ref={ref} {...props} />
              </div>
            </div>
            <div className="mt-4 grid w-[310px] grid-cols-2 gap-2 sm:w-[360px]">
              <Button variant="sober" onClick={download} disabled={busy}>
                <Download size={18} /> PNG 저장
              </Button>
              <Button variant="drunk" onClick={canShare ? share : download} disabled={busy}>
                <Share2 size={18} /> 공유하기
              </Button>
            </div>
            {msg && <p className="mt-2 text-center text-xs text-muted">{msg}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
