// 这个文件会帮我们打包 packages下的模块，最终打包出js文件

// node dev.js 要打包的名字 -f 打包的格式

import minimist from "minimist";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import esbuild from "esbuild";

// node中的命令函行参数通过process 来获取 process.argv
const args = minimist(process.argv.slice(2));

const __filename = fileURLToPath(import.meta.url); // 获取文件的绝对路径 file: -> /usr
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const target = args._[0] || "reactivity"; // 打包的模块
const format = args.f || "iife"; // 打包后的模块化规范
console.log(target, format);

// node 中esm模块没有__dirname
// 入口文件，根据命令行提供的参数来解析
const entry = resolve(__dirname, `../packages/${target}/src/index.js`);
const pkg = resolve(__dirname, `../packages/${target}/package,json`);

// 根据需要进行打包
esbuild
  .context({
    entryPoints: [entry],
    outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`),
    bundle: true, // reactivity 和 shared 会打包到一起
    format, // cjs esm iife
    // minify: true,
    sourcemap: true,
    logLevel: "info",
    platform: "browser", // 打包后给浏览器使用
    // target: "es2015",
    globalName: pkg.buildOptions?.name,
  })
  .then((ctx) => {
    console.log("start dev");
    return ctx.watch();
  });
