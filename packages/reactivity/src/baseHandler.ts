import { isObject } from "@vue/shared";
import { reactive } from "./reactive";
import { track, trigger } from "./reactiveEffect";
import { ReactiveFlags } from "./constants";

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    // 判断传入的是否是proxy对象
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }

    // 将这个对象上的这个属性，和effect关联在一起
    track(target, key);

    let result = Reflect.get(target, key, receiver);

    if (isObject(result)) {
      // 懒代理，当取值是对象的时候，将对象代理
      return reactive(result);
    }

    return result;
  },

  set(target, key, value, receiver) {
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
