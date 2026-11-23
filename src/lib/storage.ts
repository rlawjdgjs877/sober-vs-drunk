import type { SessionRecord } from "./types";

/**
 * 저장소 인터페이스.
 * 지금은 localStorage 구현을 쓰지만, 나중에 SupabaseRecordRepository를 만들어
 * `createRepository()`만 바꾸면 화면 코드는 수정 없이 동작합니다.
 */
export interface RecordRepository {
  list(): Promise<SessionRecord[]>;
  add(record: SessionRecord): Promise<void>;
  update(id: string, patch: Partial<SessionRecord>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

const KEY = "sober-vs-drunk:records:v1";

export class LocalStorageRecordRepository implements RecordRepository {
  private read(): SessionRecord[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private write(records: SessionRecord[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch (e) {
      console.error("기록 저장 실패", e);
      throw e;
    }
  }
  async list() {
    return this.read().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async add(record: SessionRecord) {
    const all = this.read();
    all.push(record);
    this.write(all);
  }
  async update(id: string, patch: Partial<SessionRecord>) {
    this.write(this.read().map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)));
  }
  async remove(id: string) {
    this.write(this.read().filter((r) => r.id !== id));
  }
  async clear() {
    this.write([]);
  }
}

// 예) export class SupabaseRecordRepository implements RecordRepository { ... }
export function createRepository(): RecordRepository {
  return new LocalStorageRecordRepository();
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
