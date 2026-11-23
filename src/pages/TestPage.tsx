import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain } from "lucide-react";
import { Page, SafetyNote, TopBar } from "@/components/Shared";
import { Character } from "@/components/Character";
import { DrinkForm } from "@/components/DrinkForm";
import { GameRunner } from "@/components/GameRunner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRecords } from "@/store/RecordsContext";
import { newId } from "@/lib/storage";
import { CURRENT_PROTOCOL, type DrinkInfo, type GameResults } from "@/lib/types";

const DRAFT = "sober-vs-drunk:draft:test";
const DRINK_DRAFT = "sober-vs-drunk:draft:test-drink";

function loadDrink(): DrinkInfo | null {
  try {
    const raw = localStorage.getItem(DRINK_DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function TestPage() {
  const nav = useNavigate();
  const { baseline, addRecord, ready } = useRecords();
  const [drink, setDrink] = useState<DrinkInfo | null>(loadDrink);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  if (!baseline) {
    return (
      <Page>
        <TopBar title="지금의 나 테스트" />
        <div className="mt-8 flex flex-col items-center text-center">
          <Character variant="drunk" mood="shocked" size={130} />
          <h1 className="mt-4 text-2xl font-extrabold">비교할 맨정신 기록이 없어요</h1>
          <p className="mt-2 text-[15px] text-muted">대결 상대가 필요해요! 맨정신일 때 먼저 기준 기록을 등록해 주세요.</p>
          <Button variant="sober" size="lg" className="mt-6 w-full" onClick={() => nav("/baseline")}>
            <Brain size={18} /> 맨정신 기록 등록하러 가기
          </Button>
        </div>
      </Page>
    );
  }

  const complete = async (r: GameResults) => {
    if (!drink) return;
    const id = newId();
    try {
      await addRecord({
        id,
        protocol: CURRENT_PROTOCOL,
        kind: "test",
        createdAt: new Date().toISOString(),
        results: r,
        drink,
        baselineSnapshot: baseline.results,
        baselineCount: baseline.count,
      });
      localStorage.removeItem(DRINK_DRAFT);
      nav(`/result/${id}?new=1`, { replace: true });
    } catch {
      setError("저장 공간이 부족해 기록을 저장하지 못했어요.");
    }
  };

  if (drink) {
    return (
      <Page>
        <TopBar
          title="지금의 나 테스트"
          onBack={() => {
            localStorage.removeItem(DRINK_DRAFT);
            localStorage.removeItem(DRAFT);
            setDrink(null);
          }}
        />
        <GameRunner tone="drunk" draftKey={DRAFT} onComplete={complete} />
        {error && <p className="mt-4 text-center text-sm text-bad">{error}</p>}
      </Page>
    );
  }

  return (
    <Page>
      <TopBar title="지금의 나 테스트" />
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-drunk/25 blur-2xl" />
          <Character variant="drunk" mood="dizzy" size={92} facing="right" />
        </div>
        <div>
          <h1 className="text-[24px] font-extrabold leading-snug">현재 상태를 확인해볼까요?</h1>
          <p className="mt-1 text-sm text-muted">
            맨정신 기준 {baseline.count}회와 비교해요 {baseline.isTemporary && <Badge tone="sober">임시 기준</Badge>}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DrinkForm
          onSubmit={(d) => {
            try {
              localStorage.setItem(DRINK_DRAFT, JSON.stringify(d));
              localStorage.removeItem(DRAFT);
            } catch {
              /* noop */
            }
            setDrink(d);
            window.scrollTo(0, 0);
          }}
        />
      </div>
      <div className="mt-6">
        <SafetyNote compact />
      </div>
    </Page>
  );
}
