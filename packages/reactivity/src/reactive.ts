import { isObject } from "@vue/shared";
import { mutableHandlers, ReactiveFlags } from "./baseHandler";

// weakmap的key只能是对象
const reactiveMap = new WeakMap();

function createReactiveObject(target) {
  if (!isObject(target)) return target;

  // 3.0 会创造一个反向映射表
  // 现在会判断他是否是proxy对象
  // 如果传入的是proxy对象则直接返回布偶处理
  // 取ReactiveFlags.IS_REACTIVE这个属性如果会触发get方法，说明是个proxy对象
  if (target[ReactiveFlags.IS_REACTIVE]) return target;

  // 一个值被重复的代理，则取缓存
  const exitsProxy = reactiveMap.get(target);
  if (exitsProxy) return exitsProxy;

  // 创建代理对象
  let proxy = new Proxy(target, mutableHandlers);
  // 根据对象缓存 代理后的结果
  reactiveMap.set(target, proxy);
  return proxy;
}

export function reactive(target) {
  return createReactiveObject(target);
}
