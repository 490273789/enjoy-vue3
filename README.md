# monorepo
## 在根目录下安装插件
- -w 是 --workspace-root缩写
```
pnpm add vue -w
```

## 安装项目中的依赖
- 将@/vue/shared 安装到 @vue/reactivity 中
```
pnpm add @vue/shared --workspace --filter @vue/reactivity
```  