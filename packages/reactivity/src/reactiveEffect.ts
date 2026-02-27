import { activeEffect, trackEffect, triggerEffects } from "./effect";

const targetMap = new WeakMap(); // 存放依赖收集的关系

export const createDep = (cleanup, key) => {
  const dep = new Map() as any; // 创建的收集器还是一个map
  dep.cleanup = cleanup;
  dep.name = key; // 自定义的为了标识这个映射表是给哪个属性服务的
  return dep;
};

// map {obj: {属性： { effect }}}
export function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);

    if (!depsMap) {
      // 新增的
      targetMap.set(target, (depsMap = new Map()));
    }

    let dep = depsMap.get(key);

    if (!dep) {
      depsMap.set(
        key,
        (dep = createDep(() => depsMap.delete(key), key)), // 后面用于清理不需要的属性
      );
    }

    // 将当前的effect放入到dep（映射表）中， 后续可以根据值的变化触发此dep中存放的effect
    trackEffect(activeEffect, dep);
  }
}

export function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);

  if (!depsMap) {
    // 找不到对象 直接return即可
    return;
  }
  let dep = depsMap.get(key);
  if (dep) {
    // 修改的属性对应了effect
    triggerEffects(dep);
  }
}
