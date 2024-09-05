import { isObject } from "@vue/shared";
import { mutableHandlers, ReactiveFlags } from "./baseHandler";

const reactiveMap = new WeakMap();

function createReactiveObject(target) {
  if (!isObject(target)) return target;

  // 如果传入的对象是个proxy
  if (target[ReactiveFlags.IS_REACTIVE]) return target;

  // 一个值被重复的代理，则取缓存
  const exitsProxy = reactiveMap.get(target);
  if (exitsProxy) return exitsProxy;

  let proxy = new Proxy(target, mutableHandlers);
  // 根据对象缓存 代理后的结果
  reactiveMap.set(target, proxy);
  return proxy;
}

export function reactive(target) {
  return createReactiveObject(target);
}
