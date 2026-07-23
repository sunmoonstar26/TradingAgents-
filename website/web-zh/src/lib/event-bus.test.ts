import { test } from "node:test";
import assert from "node:assert/strict";
import { on, emit } from "./event-bus";

test("emit 调用所有已注册的订阅者，并传递 payload", async () => {
  const received: number[] = [];
  on<number>("test.event", async (payload) => {
    received.push(payload);
  });
  on<number>("test.event", async (payload) => {
    received.push(payload * 10);
  });

  await emit<number>("test.event", 5);

  assert.deepEqual(received, [5, 50]);
});

test("单个订阅者抛错不阻断其他订阅者继续执行", async () => {
  const received: string[] = [];
  on<string>("test.event.error", async () => {
    throw new Error("订阅者 A 故意失败");
  });
  on<string>("test.event.error", async (payload) => {
    received.push(payload);
  });

  await emit<string>("test.event.error", "ok");

  assert.deepEqual(received, ["ok"]);
});

test("没有订阅者时 emit 不报错", async () => {
  await assert.doesNotReject(() => emit("test.event.nobody", {}));
});
