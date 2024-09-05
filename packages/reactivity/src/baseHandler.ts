export enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    // 取值的时候，应该让响应式属性和effect 映射起来
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    // 找到属性，让对应的effect重新执行

    return Reflect.set(target, key, value, receiver);
  },
};
