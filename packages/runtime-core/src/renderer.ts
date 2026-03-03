import { ShapeFlags, hasOwn } from "@vue/shared";
import { Fragment, Text, createVNode, isSameVNode } from "./vnode";

import { ReactiveEffect, isRef, reactive } from "@vue/reactivity";

export function createRenderer(renderOptions) {
  // core中不关心如何渲染

  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  const mountChildren = (children, container, anchor, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      //  children[i] 可能是纯文本元素
      patch(null, children[i], container, anchor, parentComponent);
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;

    // 第一次渲染的时候我么让虚拟节点和真实的dom 创建关联 vnode.el = 真实dom
    // 第二次渲染新的vnode，可以和上一次的vnode做比对，之后更新对应的el元素，可以后续再复用这个dom元素
    let el = (vnode.el = hostCreateElement(type));
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    // 9 & 8 > 0 说明儿子是文本元素
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, anchor, parentComponent);
    }

    if (transition) {
      transition.beforeEnter(el);
    }

    hostInsert(el, container, anchor);

    if (transition) {
      transition.enter(el);
    }
    // hostCreateElement()
  };

  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      // 初始化操作
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, container, anchor, parentComponent);
    }
  };

  const patchProps = (oldProps, newProps, el) => {
    // 新的要全部生效
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }
    for (let key in oldProps) {
      if (!(key in newProps)) {
        // 以前多的现在没有了，需要删除掉
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
    //  text  array  null
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
        parentComponent,
      );
    }
  };
  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    // 1.比较元素的差异，肯定需要复用dom元素
    // 2.比较属性和元素的子节点
    let el = (n2.el = n1.el); // 对dom元素的复用

    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    //

    patchProps(oldProps, newProps, el);
  };

  const processText = (n1, n2, container) => {
    if (n1 == null) {
      // 1.虚拟节点要关联真实节点
      // 2.将节点插入到页面中
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  // 渲染走这里，更新也走这里
  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      mountChildren(n2.children, container, anchor, parentComponent);
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent);
    }
  };

  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next; // instance.props
    updataProps(instance, instance.props, next.props || {});

    // 组件更新的时候 需要更新插槽
    Object.assign(instance.slots, next.children);
  };

  function renderComponent(instance) {
    // attrs , props  = 属性
    const { render, vnode, proxy, props, attrs, slots } = instance;
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy);
    } else {
      // 此写法 不用使用了，vue3中没有任何性能优化
      return vnode.type(attrs, { slots }); // 函数式组件
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
    // instance.props  ->

    if (hasPropsChange(prevProps, nextProps)) {
      // 看属性是否存在变化
      for (let key in nextProps) {
        // 用新的覆盖掉所有老的
        instance.props[key] = nextProps[key]; // 更新
      }
      for (let key in instance.props) {
        // 删除老的多于的
        if (!(key in nextProps)) {
          delete instance.props[key];
        }
      }
      // instance.props.address = '上海'
    }
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    if (prevChildren || nextChildren) return true; // 有插槽直接走重新渲染即可

    if (prevProps === nextProps) return false;

    // 如果属性不一致实则更新
    return hasPropsChange(prevProps, nextProps || {});

    // updataProps(instance, prevProps, nextProps); // children   instance.component.proxy
  };
  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component); // 复用组件的实例
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2; // 如果调用update 有next属性，说明是属性更新，插槽更新
      instance.update(); // 让更新逻辑统一
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        // 需要走keepAlive中的激活方法
        parentComponent.ctx.activate(n2, container, anchor);
      } else {
        // mountComponent(n2, container, anchor, parentComponent);
      }
    } else {
      // 组件的更新
      updateComponent(n1, n2);
    }
  };
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 == n2) {
      // 两次渲染同一个元素直接跳过即可
      return;
    }
    // 直接移除老的dom元素，初始化新的dom元素
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null; // 就会执行后续的n2的初始化
    }
    const { type, shapeFlag, ref } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent); // 对元素处理
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container, anchor) {
              // 此方法可以将组件 或者dom元素移动到指定的位置
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container,
                anchor,
              );
            },
          });
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 对组件的处理，vue3中函数式组件，已经废弃了，没有性能节约
          processComponent(n1, n2, container, anchor, parentComponent);
        }
    }

    if (ref !== null) {
      // n2 是dom 还是 组件 还是组件有expose
      setRef(ref, n2);
    }
  };
  function setRef(rawRef, vnode) {
    let value =
      vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
        ? vnode.component.exposed || vnode.component.proxy
        : vnode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  }
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode;
    const performRemove = () => {
      hostRemove(vnode.el);
    };
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      // 需要找keep走失活逻辑
      parentComponent.ctx.deactivate(vnode);
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent);
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      unmount(vnode.component.subTree, parentComponent);
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      if (transition) {
        transition.leave(el, performRemove);
      } else {
        performRemove();
      }
    }
  };
  // 多次调用render 会进行虚拟节点的比较，在进行更新
  const render = (vnode, container) => {
    if (vnode == null) {
      // 我要移除当前容器中的dom元素
      if (container._vnode) {
        unmount(container._vnode, null);
      }
    } else {
      // 将虚拟节点变成真实节点进行渲染
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render,
  };
}
