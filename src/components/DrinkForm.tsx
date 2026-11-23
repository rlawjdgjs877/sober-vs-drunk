import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DrinkInfo, DrinkType, Feeling } from "@/lib/types";
import { cn, nowHHMM } from "@/lib/utils";
import { Button } from "./ui/button";

export const DRINKS: { type: DrinkType; label: string; emoji: string; abv: number; presets: { label: string; ml: number }[] }[] = [
  { type: "soju", label: "소주", emoji: "🍶", abv: 16.5, presets: [{ label: "1잔", ml: 50 }, { label: "반병", ml: 180 }, { label: "1병", ml: 360 }] },
  { type: "beer", label: "맥주", emoji: "🍺", abv: 4.5, presets: [{ label: "1캔", ml: 355 }, { label: "500cc", ml: 500 }, { label: "1L", ml: 1000 }] },
  { type: "wine", label: "와인", emoji: "🍷", abv: 12, presets: [{ label: "1잔", ml: 150 }, { label: "2잔", ml: 300 }, { label: "1병", ml: 750 }] },
  { type: "makgeolli", label: "막걸리", emoji: "🥛", abv: 6, presets: [{ label: "1사발", ml: 250 }, { label: "1병", ml: 750 }] },
  { type: "whisky", label: "위스키", emoji: "🥃", abv: 40, presets: [{ label: "1샷", ml: 30 }, { label: "2샷", ml: 60 }, { label: "1잔", ml: 45 }] },
  { type: "etc", label: "기타", emoji: "🍹", abv: 10, presets: [] },
];

export const FEELINGS: { value: Feeling; label: string; emoji: string }[] = [
  { value: "fine", label: "멀쩡함", emoji: "😎" },
  { value: "tipsy", label: "조금 취함", emoji: "🥴" },
  { value: "drunk", label: "많이 취함", emoji: "😵‍💫" },
];

export const drinkLabel = (t: DrinkType | null) => DRINKS.find((d) => d.type === t)?.label ?? "-";
export const feelingLabel = (f: Feeling) => FEELINGS.find((x) => x.value === f)?.label ?? "-";

const field = "h-12 w-full rounded-2xl border border-line bg-surface2 px-4 text-[16px] text-white outline-none focus:border-drunk focus:ring-2 focus:ring-drunk/30";

export function DrinkForm({ onSubmit }: { onSubmit: (d: DrinkInfo) => void }) {
  const [drank, setDrank] = useState(true);
  const [type, setType] = useState<DrinkType | null>(null);
  const [volume, setVolume] = useState("");
  const [abv, setAbv] = useState("");
  const [startTime, setStartTime] = useState("");
  const [lastTime, setLastTime] = useState(nowHHMM());
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [touched, setTouched] = useState(false);

  const vol = Number(volume);
  const abvN = Number(abv);
  const errors: string[] = [];
  if (drank) {
    if (!type) errors.push("술 종류를 선택해 주세요.");
    if (!volume || !(vol > 0) || vol > 10000) errors.push("마신 용량을 mL 단위로 입력해 주세요.");
    if (abv === "" || !(abvN >= 0) || abvN > 100) errors.push("알코올 도수를 0~100 사이로 입력해 주세요.");
    if (!startTime) errors.push("음주 시작 시각을 입력해 주세요.");
    if (!lastTime) errors.push("마신 시각을 입력해 주세요.");
  }
  if (!feeling) errors.push("지금 느끼는 상태를 선택해 주세요.");

  const submit = () => {
    setTouched(true);
    if (errors.length) return;
    onSubmit(
      drank
        ? { drank: true, type, volumeMl: vol, abv: abvN, startTime, lastTime, feeling: feeling! }
        : { drank: false, type: null, volumeMl: null, abv: null, startTime: null, lastTime: null, feeling: feeling! },
    );
  };

  const selected = DRINKS.find((d) => d.type === type);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5">
        {[
          [true, "술을 마셨어요"],
          [false, "마시지 않았어요"],
        ].map(([v, l]) => (
          <button
            key={String(v)}
            onClick={() => setDrank(v as boolean)}
            className={cn("h-11 rounded-xl text-sm font-bold transition active:scale-95", drank === v ? "bg-drunk text-[#1F0B02]" : "text-muted")}
          >
            {l as string}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {drank && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-5 overflow-hidden">
            <section>
              <label className="mb-2 block text-sm font-bold">술 종류</label>
              <div className="grid grid-cols-3 gap-2">
                {DRINKS.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => {
                      setType(d.type);
                      setAbv(String(d.abv));
                    }}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center rounded-2xl border text-sm font-bold transition active:scale-95",
                      type === d.type ? "border-drunk bg-drunk/15 text-drunk" : "border-line bg-surface text-white/80",
                    )}
                  >
                    <span className="text-xl">{d.emoji}</span>
                    {d.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold">마신 용량 (mL)</label>
                <input className={field} type="number" inputMode="numeric" min={0} placeholder="예) 360" value={volume} onChange={(e) => setVolume(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">알코올 도수 (%)</label>
                <input className={field} type="number" inputMode="decimal" min={0} max={100} step="0.1" placeholder="예) 16.5" value={abv} onChange={(e) => setAbv(e.target.value)} />
              </div>
            </section>
            {selected && selected.presets.length > 0 && (
              <div className="-mt-2 flex flex-wrap gap-2">
                {selected.presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setVolume(String(Number(volume || 0) + p.ml))}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-white/80 active:scale-95"
                  >
                    +{p.label} ({p.ml}mL)
                  </button>
                ))}
                <button onClick={() => setVolume("")} className="rounded-full px-3 py-1.5 text-xs text-muted">
                  초기화
                </button>
              </div>
            )}

            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold">음주 시작 시각</label>
                <input className={field} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">마신 시각 (마지막 잔)</label>
                <input className={field} type="time" value={lastTime} onChange={(e) => setLastTime(e.target.value)} />
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <label className="mb-2 block text-sm font-bold">지금 내가 느끼는 상태</label>
        <div className="grid grid-cols-3 gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFeeling(f.value)}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-bold transition active:scale-95",
                feeling === f.value ? "border-drunk bg-drunk/15 text-drunk" : "border-line bg-surface text-white/80",
              )}
            >
              <span className="text-2xl">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {touched && errors.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <Button variant="drunk" size="lg" className="w-full" onClick={submit}>
        테스트 시작하기
      </Button>
      <p className="text-center text-xs text-muted">입력한 정보는 이 기기에만 저장되고, 기록용으로만 사용돼요.</p>
    </div>
  );
}
