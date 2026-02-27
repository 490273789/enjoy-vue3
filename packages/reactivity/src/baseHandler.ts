import { isObject } from "@vue/shared";
import { reactive } from "./reactive";
import { track, trigger } from "./reactiveEffect";

export enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    track(target, key); // 收集这个对象上的这个属性，和effect关联在一起

    let result = Reflect.get(target, key, receiver);

    if (isObject(result)) {
      // 懒代理，当取值是对象的时候，将对象代理
      return reactive(result);
    }
    // 取值的时候，应该让响应式属性和effect 映射起来
    return result;
  },
  set(target, key, value, receiver) {
    // 找到属性 让对应的effect重新执行

    let oldValue = target[key];

    let result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      // 需要触发页面更新
      trigger(target, key, value, oldValue);
    }
    // 触发更新 todo...
    return result;
  },
};
