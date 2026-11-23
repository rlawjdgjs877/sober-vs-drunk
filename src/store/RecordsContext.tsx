import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRepository } from "@/lib/storage";
import type { SessionRecord } from "@/lib/types";
import { computeBaseline, type BaselineInfo } from "@/lib/stats";

type Ctx = {
  records: SessionRecord[];
  ready: boolean;
  baseline: BaselineInfo | null;
  tests: SessionRecord[];
  addRecord: (r: SessionRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<SessionRecord>) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const RecordsContext = createContext<Ctx | null>(null);
const repo = createRepository();

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setRecords(await repo.list());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    // 다른 탭에서 변경된 경우 동기화
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      records,
      ready,
      baseline: computeBaseline(records),
      tests: records.filter((r) => r.kind === "test"),
      addRecord: async (r) => {
        await repo.add(r);
        await refresh();
      },
      updateRecord: async (id, patch) => {
        await repo.update(id, patch);
        await refresh();
      },
      removeRecord: async (id) => {
        await repo.remove(id);
        await refresh();
      },
      clearAll: async () => {
        await repo.clear();
        await refresh();
      },
    }),
    [records, ready, refresh],
  );

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const ctx = useContext(RecordsContext);
  if (!ctx) throw new Error("RecordsProvider가 필요합니다");
  return ctx;
}
