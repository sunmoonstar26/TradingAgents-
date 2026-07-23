import { test } from "node:test";
import assert from "node:assert/strict";
import { on, emit } from "./event-bus";

test("emit 调用所有已注册的订阅者，并传递 payload；全部成功时返回空错误数组", async () => {
  const received: number[] = [];
  on<number>("test.event", async (payload) => {
    received.push(payload);
  });
  on<number>("test.event", async (payload) => {
    received.push(payload * 10);
  });

  const errors = await emit<number>("test.event", 5);

  assert.deepEqual(received, [5, 50]);
  assert.deepEqual(errors, []);
});

test("单个订阅者抛错不阻断其他订阅者继续执行，且抛出的错误会体现在 emit 的返回值中", async () => {
  const received: string[] = [];
  const thrown = new Error("订阅者 A 故意失败");
  on<string>("test.event.error", async () => {
    throw thrown;
  });
  on<string>("test.event.error", async (payload) => {
    received.push(payload);
  });

  const errors = await emit<string>("test.event.error", "ok");

  assert.deepEqual(received, ["ok"]);
  assert.deepEqual(errors, [thrown]);
});

test("没有订阅者时 emit 不报错，并返回空错误数组", async () => {
  const errors = await emit("test.event.nobody", {});
  assert.deepEqual(errors, []);
});
