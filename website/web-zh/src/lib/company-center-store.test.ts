import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getHiddenTickers, hideTicker, unhideTicker } from "./company-center-store";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

before(() => {
  // src/lib/company-center-store.ts 内部会检测 `typeof window === "undefined"`，
  // 测试环境（Node）没有 window，这里手动模拟出一个最小 window+localStorage。
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
});

beforeEach(() => {
  localStorage.clear();
});

test("getHiddenTickers 初始为空数组", () => {
  assert.deepEqual(getHiddenTickers(), []);
});

test("hideTicker 把 ticker 加入隐藏列表（自动转大写）", () => {
  hideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});

test("hideTicker 重复调用不产生重复项", () => {
  hideTicker("AAPL");
  hideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});

test("unhideTicker 把 ticker 从隐藏列表移除", () => {
  hideTicker("AAPL");
  hideTicker("MSFT");
  unhideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["MSFT"]);
});

test("unhideTicker 对不存在的 ticker 无副作用", () => {
  hideTicker("AAPL");
  unhideTicker("MSFT");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});
