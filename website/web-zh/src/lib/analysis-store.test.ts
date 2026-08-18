import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  getSession,
  completeSession,
  failSession,
} from "./analysis-store";

test("completeSession 在结果 JSON 解析失败时应将状态置为 failed，而不是卡在 completed", () => {
  const session = createSession("TESTCS1", "US", "standard");

  completeSession(session.session_id, "{not valid json");

  const updated = getSession(session.session_id);
  assert.equal(updated?.status, "failed");
  assert.ok(updated?.error_message);
});

test("completeSession 在结果映射失败时（缺少必要字段）应将状态置为 failed", () => {
  const session = createSession("TESTCS2", "US", "standard");

  // raw.ticker 缺失会导致 mapTAResultToStockDetail 内部抛错
  completeSession(session.session_id, JSON.stringify({ signal: "buy" }));

  const updated = getSession(session.session_id);
  assert.equal(updated?.status, "failed");
});

test("completeSession 在结果有效时应将状态置为 completed", () => {
  const session = createSession("TESTCS3", "US", "standard");

  completeSession(
    session.session_id,
    JSON.stringify({ ticker: "TESTCS3", signal: "buy" })
  );

  const updated = getSession(session.session_id);
  assert.equal(updated?.status, "completed");
});

test("failSession 应设置 status 为 failed 并记录 error_message", () => {
  const session = createSession("TESTCS4", "US", "standard");

  failSession(session.session_id, "后端连接失败");

  const updated = getSession(session.session_id);
  assert.equal(updated?.status, "failed");
  assert.equal(updated?.error_message, "后端连接失败");
});
