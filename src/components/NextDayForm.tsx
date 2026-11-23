import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { NextDayLog } from "@/lib/types";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

function Scale({ label, value, onChange, hints }: { label: string; value: number; onChange: (v: number) => void; hints: [string, string] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-sm font-bold text-drunk">{value} / 5</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "h-11 rounded-xl border text-sm font-bold transition active:scale-95",
              value === n ? "border-drunk bg-drunk/20 text-drunk" : "border-line bg-surface2 text-white/70",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

export function NextDaySheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: NextDayLog;
  onClose: () => void;
  onSave: (n: NextDayLog) => Promise<void> | void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-8 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Inner initial={initial} onClose={onClose} onSave={onSave} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Inner({ initial, onClose, onSave }: { initial?: NextDayLog; onClose: () => void; onSave: (n: NextDayLog) => Promise<void> | void }) {
  const [hangover, setHangover] = useState(initial?.hangover ?? 0);
  const [fatigue, setFatigue] = useState(initial?.fatigue ?? 0);
  const [blackout, setBlackout] = useState(initial?.blackout ?? false);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold">다음 날 상태 기록</h3>
          <p className="text-xs text-muted">그날의 테스트 결과와 함께 저장돼요</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="닫기">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-5">
        <Scale label="숙취 정도" value={hangover} onChange={setHangover} hints={["전혀 없음", "매우 심함"]} />
        <Scale label="피로도" value={fatigue} onChange={setFatigue} hints={["개운함", "매우 피곤"]} />
        <div>
          <div className="mb-2 text-sm font-bold">기억이 흐릿했던 순간이 있었나요?</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              [false, "없었어요"],
              [true, "있었어요"],
            ].map(([v, l]) => (
              <button
                key={String(v)}
                onClick={() => setBlackout(v as boolean)}
                className={cn(
                  "h-11 rounded-xl border text-sm font-bold transition active:scale-95",
                  blackout === v ? "border-drunk bg-drunk/20 text-drunk" : "border-line bg-surface2 text-white/70",
                )}
              >
                {l as string}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-bold">메모</div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="예) 물을 많이 마셔서 괜찮았다"
            className="w-full resize-none rounded-2xl border border-line bg-surface2 p-3 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-drunk"
          />
          <div className="text-right text-[11px] text-muted">{memo.length}/300</div>
        </div>
        <Button
          variant="drunk"
          size="lg"
          className="w-full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ hangover, fatigue, blackout, memo: memo.trim(), recordedAt: new Date().toISOString() });
            setSaving(false);
            onClose();
          }}
        >
          저장하기
        </Button>
      </div>
    </>
  );
}
