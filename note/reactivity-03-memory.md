# 速记卡：如何快速记住这套响应式实现

## 1. 五句话记全模块

1. `reactive` 负责对象代理，`ref` 负责单值响应式。
2. 读取走 `track`，修改走 `trigger`。
3. `effect` 是响应式执行单元，`scheduler` 决定“何时执行”。
4. `computed` 是“懒执行 + 缓存 + 脏标记”。
5. `watch` 是“effect + job + old/new + cleanup”。

---

## 2. 结构速记

### 依赖图

- 大图：`targetMap (WeakMap)`
- 中图：`depsMap (Map<key, dep>)`
- 小图：`dep (Map<effect, trackId>)`

### Effect 关键字段

- `_trackId`：本轮执行编号（用于避免重复收集）
- `deps`：当前 effect 关联的 dep 列表
- `_depsLength`：本轮有效依赖长度（配合清理旧依赖）
- `_running`：防止递归触发导致死循环
- `_dirtyLevel`：计算属性脏状态基础

---

## 3. 你这版实现里的亮点

- 依赖清理机制完整：`preCleanEffect + postCleanEffect`
- dep 支持 `cleanup`，空 dep 自动从 `depsMap` 移除
- `reactive` 做了代理缓存和懒代理
- `watch` 支持 `immediate` 与 `onCleanup`
- `proxyRefs` 提升了模板/对象使用体验

---

## 4. 阅读源码建议路线

- 第 1 遍：只看 `reactive + baseHandler + reactiveEffect`
- 第 2 遍：看 `effect` 的 run/stop 与依赖清理
- 第 3 遍：看 `ref` 如何接入同一套 track/trigger
- 第 4 遍：看 `computed` dirty 策略
- 第 5 遍：看 `watch` 的 getter 和 job 调度

---

## 5. 可继续思考的问题（进阶）

- `computed.value` 的依赖收集时机是否需要在每次访问都执行？
- `watch` 如何支持数组 source、多 source、`flush` 时机？
- `set` 时是否区分“新增属性”和“修改属性”？
- 调度器如何接入微任务队列实现批量更新？
