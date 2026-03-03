// packages/reactivity/src/effect.ts
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
  if (options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var activeEffect;
function preCleanEffect(effect2) {
  effect2._depsLength = 0;
  effect2._trackId++;
}
function postCleanEffect(effect2) {
  if (effect2.deps.length > effect2._depsLength) {
    for (let i = effect2._depsLength; i < effect2.deps.length; i++) {
      cleanDepEffect(effect2.deps[i], effect2);
    }
    effect2.deps.length = effect2._depsLength;
  }
}
var ReactiveEffect = class {
  // 创建的effect是响应式的
  // fn 用户编写的函数
  // 如果fn中依赖的数据发生变化后，需要重新调用 -> run()
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前effect执行了几次
    this.deps = [];
    // 存放这个effect中使用的响应属性
    this._depsLength = 0;
    // 响应属性的长度
    this._dirtyLevel = 4 /* Dirty */;
    this._running = 0;
    this.active = true;
  }
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  set dirty(v) {
    this._dirtyLevel = v ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
  run() {
    this._dirtyLevel = 0 /* NoDirty */;
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    if (this.active) {
      this.active = false;
      preCleanEffect(this);
      postCleanEffect(this);
    }
  }
};
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size == 0) {
    dep.cleanup();
  }
}
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    let oldDep = effect2.deps[effect2._depsLength];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2.deps[effect2._depsLength++] = dep;
    } else {
      effect2._depsLength++;
    }
  }
}
function triggerEffects(dep) {
  for (const effect2 of dep.keys()) {
    if (effect2._dirtyLevel < 4 /* Dirty */) {
      effect2._dirtyLevel = 4 /* Dirty */;
    }
    if (!effect2._running) {
      if (effect2.scheduler) {
        effect2.scheduler();
      }
    }
  }
}

// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value == "function";
}
function isString(value) {
  return typeof value == "string";
}

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
var createDep = (cleanup, key) => {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  dep.name = key;
  return dep;
};
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(
        key,
        dep = createDep(() => depsMap.delete(key), key)
        // 后面用于清理不需要的属性
      );
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

// packages/reactivity/src/baseHandler.ts
var mutableHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let result = Reflect.get(target, key, receiver);
    if (isObject(result)) {
      return reactive(result);
    }
    return result;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return result;
  }
};

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function createReactiveObject(target) {
  if (!isObject(target)) return target;
  if (target["__v_isReactive" /* IS_REACTIVE */]) return target;
  const exitsProxy = reactiveMap.get(target);
  if (exitsProxy) return exitsProxy;
  let proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function reactive(target) {
  return createReactiveObject(target);
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return createRef(value);
}
function createRef(value) {
  return new RefImpl(value);
}
var RefImpl = class {
  // 用于收集对应的effect
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue;
      this._value = toReactive(newValue);
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref2.dep = ref2.dep || createDep(() => ref2.dep = void 0, "undefined")
    );
  }
}
function triggerRefValue(ref2) {
  let dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
}
var ObjectRefImpl = class {
  // 增加ref标识
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  const res = {};
  for (let key in object) {
    res[key] = toRef(object, key);
  }
  return res;
}
function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver);
      return r.__v_isRef ? r.value : r;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}
function isRef(value) {
  return value && value.__v_isRef;
}

// packages/runtime-core/src/components/Teleport.ts
var Teleport = {
  __isTeleport: true,
  remove(vnode, unmountChildren) {
    const { shapeFlag, children } = vnode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      unmountChildren(children);
    }
  },
  process(n1, n2, container, anchor, parentComponent, internals) {
    let { mountChildren, patchChildren, move } = internals;
    if (!n1) {
      const target = n2.target = document.querySelector(n2.props.to);
      if (target) {
        mountChildren(n2.children, target, parentComponent);
      }
    } else {
      patchChildren(n1, n2, n2.target, parentComponent);
      if (n2.props.to !== n1.props.to) {
        const nextTarget = document.querySelector(n2.props.to);
        n2.children.forEach((child) => move(child, nextTarget, anchor));
      }
    }
  }
};
var isTeleport = (value) => value.__isTeleport;

// packages/runtime-core/src/vnode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function isVNode(value) {
  return value?.__v_isVNode;
}
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children, patchFlag) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props?.key,
    // diff算法后面需要的key
    el: null,
    // 虚拟节点需要对应的真实节点是谁
    shapeFlag,
    ref: props?.ref,
    patchFlag
  };
  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode);
  }
  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}
var currentBlock = null;
function openBlock() {
  currentBlock = [];
}
function closeBlock() {
  currentBlock = null;
}
function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();
  return vnode;
}
function createElementBlock(type, props, children, patchFlag) {
  const vnode = createVNode(type, props, children, patchFlag);
  return setupBlock(vnode);
}
function toDisplayString(value) {
  return isString(value) ? value : value == null ? "" : isObject(value) ? JSON.stringify(value) : String(value);
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        return createVNode(type, propsOrChildren);
      }
    }
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l == 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions;
  const mountChildren = (children, container, anchor, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container, anchor, parentComponent);
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
    let el = vnode.el = hostCreateElement(type);
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, anchor, parentComponent);
    }
    if (transition) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if (transition) {
      transition.enter(el);
    }
  };
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, anchor, parentComponent);
    }
  };
  const patchProps = (oldProps, newProps, el) => {
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };
  const unmountChildren = (children, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child, parentComponent);
    }
  };
  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    const c1 = n1.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
  };
  const patchBlockChildren = (n1, n2, el, anchor, parentComponent) => {
    for (let i = 0; i < n2.dynamicChildren.length; i++) {
      patch(
        n1.dynamicChildren[i],
        n2.dynamicChildren[i],
        el,
        anchor,
        parentComponent
      );
    }
  };
  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    let el = n2.el = n1.el;
    let oldProps = n1.props || {};
    let newProps = n2.props || {};
    patchProps(oldProps, newProps, el);
  };
  const processText = (n1, n2, container) => {
    if (n1 == null) {
      hostInsert(n2.el = hostCreateText(n2.children), container);
    } else {
      const el = n2.el = n1.el;
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      mountChildren(n2.children, container, anchor, parentComponent);
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent);
    }
  };
  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next;
    updataProps(instance, instance.props, next.props || {});
    Object.assign(instance.slots, next.children);
  };
  function renderComponent(instance) {
    const { render: render2, vnode, proxy, props, attrs, slots } = instance;
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      return render2.call(proxy, proxy);
    } else {
      return vnode.type(attrs, { slots });
    }
  }
  const hasPropsChange = (prevProps, nextProps) => {
    let nKeys = Object.keys(nextProps);
    if (nKeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    for (let i = 0; i < nKeys.length; i++) {
      const key = nKeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updataProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) {
      for (let key in nextProps) {
        instance.props[key] = nextProps[key];
      }
      for (let key in instance.props) {
        if (!(key in nextProps)) {
          delete instance.props[key];
        }
      }
    }
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if (prevChildren || nextChildren) return true;
    if (prevProps === nextProps) return false;
    return hasPropsChange(prevProps, nextProps || {});
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        parentComponent.ctx.activate(n2, container, anchor);
      } else {
      }
    } else {
      updateComponent(n1, n2);
    }
  };
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 == n2) {
      return;
    }
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null;
    }
    const { type, shapeFlag, ref: ref2 } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & 64 /* TELEPORT */) {
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container2, anchor2) {
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container2,
                anchor2
              );
            }
          });
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor, parentComponent);
        }
    }
    if (ref2 !== null) {
      setRef(ref2, n2);
    }
  };
  function setRef(rawRef, vnode) {
    let value = vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */ ? vnode.component.exposed || vnode.component.proxy : vnode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  }
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode;
    const performRemove = () => {
      hostRemove(vnode.el);
    };
    if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
      parentComponent.ctx.deactivate(vnode);
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent);
    } else if (shapeFlag & 6 /* COMPONENT */) {
      unmount(vnode.component.subTree, parentComponent);
    } else if (shapeFlag & 64 /* TELEPORT */) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      if (transition) {
        transition.leave(el, performRemove);
      } else {
        performRemove();
      }
    }
  };
  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render
  };
}
export {
  Fragment,
  ReactiveEffect,
  Teleport,
  Text,
  activeEffect,
  closeBlock,
  createElementBlock,
  createVNode as createElementVNode,
  createRenderer,
  createVNode,
  effect,
  h,
  isReactive,
  isRef,
  isSameVNode,
  isTeleport,
  isVNode,
  openBlock,
  proxyRefs,
  reactive,
  ref,
  setupBlock,
  toDisplayString,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffects,
  triggerRefValue
};
//# sourceMappingURL=runtime-core.js.map
