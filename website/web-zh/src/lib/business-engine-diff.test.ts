import { test } from "node:test";
import assert from "node:assert/strict";
import { detectChange } from "./business-engine-diff";
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence, EngineChangeType,
} from "@/types/enums";
import type { BusinessEngine, ExtractedBusinessEngine } from "@/types";

function makeIncoming(overrides: Partial<ExtractedBusinessEngine> = {}): ExtractedBusinessEngine {
  return {
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: RevenueRole.CORE,
    lifecycle_stage: LifecycleStage.SCALING,
    trend: EngineTrend.STABLE,
    confidence: EngineConfidence.HIGH,
    evidence: [],
    ...overrides,
  };
}

function makePrevious(overrides: Partial<BusinessEngine> = {}): BusinessEngine {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: RevenueRole.CORE,
    lifecycle_stage: LifecycleStage.SCALING,
    trend: EngineTrend.STABLE,
    confidence: EngineConfidence.HIGH,
    evidence: [],
    last_verified_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("detectChange：无历史记录时判定为 BASELINE", () => {
  const result = detectChange(null, makeIncoming(), false);
  assert.equal(result.changeType, EngineChangeType.BASELINE);
});

test("detectChange：previous 为 null 但公司已有其他 Business Engine 时判定为 NEW", () => {
  const result = detectChange(null, makeIncoming(), true);
  assert.equal(result.changeType, EngineChangeType.NEW);
});

test("detectChange：所有字段都不变时判定为 STABLE", () => {
  const result = detectChange(makePrevious(), makeIncoming(), true);
  assert.equal(result.changeType, EngineChangeType.STABLE);
});

test("detectChange：revenue_role 从低到高变化时判定为 PROMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.EMERGING });
  const incoming = makeIncoming({ revenue_role: RevenueRole.CORE });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.PROMOTED);
});

test("detectChange：revenue_role 从高到低变化时判定为 DEMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.CORE });
  const incoming = makeIncoming({ revenue_role: RevenueRole.EMERGING });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.DEMOTED);
});

test("detectChange：trend 转为 DOWN 时判定为 WEAKENING", () => {
  const previous = makePrevious({ trend: EngineTrend.STABLE });
  const incoming = makeIncoming({ trend: EngineTrend.DOWN });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.WEAKENING);
});

test("detectChange：trend 转为 UP 时判定为 GROWING", () => {
  const previous = makePrevious({ trend: EngineTrend.STABLE });
  const incoming = makeIncoming({ trend: EngineTrend.UP });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.GROWING);
});

test("detectChange：lifecycle_stage 变为 ABANDONED 时判定为 ABANDONED，优先于其他判定", () => {
  const previous = makePrevious({
    revenue_role: RevenueRole.EMERGING,
    lifecycle_stage: LifecycleStage.SCALING,
  });
  const incoming = makeIncoming({
    revenue_role: RevenueRole.CORE, // 即便同时发生了"升级"，ABANDONED 优先
    lifecycle_stage: LifecycleStage.ABANDONED,
  });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.ABANDONED);
});

test("detectChange：UNKNOWN 之间的变化不产生虚假的 PROMOTED/DEMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.UNKNOWN });
  const incoming = makeIncoming({ revenue_role: RevenueRole.UNKNOWN });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.STABLE);
});

test("detectChange：无法归类为明确升降的其他变化判定为 UNCERTAIN", () => {
  const previous = makePrevious({ confidence: EngineConfidence.LOW });
  const incoming = makeIncoming({ confidence: EngineConfidence.HIGH });
  const result = detectChange(previous, incoming, true);
  assert.equal(result.changeType, EngineChangeType.UNCERTAIN);
});
