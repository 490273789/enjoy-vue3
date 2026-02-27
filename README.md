# monorepo

## 在根目录下安装插件

- -w 是 --workspace-root缩写

```
pnpm add vue -w
```

## 安装项目中的依赖

- 将@/vue/shared 安装到 @vue/reactivity 中
  --workspace 告诉pnpm是在安装当前项目正宗的这个包，不是去npm仓库安装

```
pnpm add @vue/shared --workspace --filter @vue/reactivity
```

"dev": "node scripts/dev.js reactivity -f esm"
-f [format] esm: es6模块
