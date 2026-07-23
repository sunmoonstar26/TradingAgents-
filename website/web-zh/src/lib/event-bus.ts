// 进程内同步发布订阅：模块间禁止直接调用，必须通过事件解耦（AlphaOS Workflow First 原则）。
// 不做队列/持久化/重放——这是 V2.0 Workflow 自动化的范畴，现阶段没有对应基础设施。

type Handler<T> = (payload: T) => Promise<void>;

const handlers = new Map<string, Handler<unknown>[]>();

export function on<T>(event: string, handler: Handler<T>): void {
  const list = handlers.get(event) ?? [];
  list.push(handler as Handler<unknown>);
  handlers.set(event, list);
}

/**
 * 逐个 await 订阅者；单个订阅者失败仅记录日志，不阻断其他订阅者继续执行。
 */
export async function emit<T>(event: string, payload: T): Promise<void> {
  const list = handlers.get(event) ?? [];
  for (const handler of list) {
    try {
      await handler(payload);
    } catch (e) {
      console.error(`[EventBus] "${event}" 订阅者执行失败:`, e);
    }
  }
}
