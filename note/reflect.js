// const obj = {
//   _name: "李四",
//   get name() {
//     return this._name; // 这里的 this 是谁？
//   },
// };

// const proxyObj = new Proxy(obj, {
//   get(target, key, receiver) {
//     // 假设我们这样写：return target[key];
//     // 当读取 proxyObj.name 时，触发 getter，
//     // 此时 getter 内部的 this 指向的是源对象 obj，而不是代理对象 proxyObj！
//     // 这样会漏掉对 _name 的进一步拦截拦截。
//     // 当_name改变的时候不会更新页面

//     // 正确写法：使用 Reflect
//     return Reflect.get(target, key, receiver);
//     // receiver 就是 proxyObj 本身，
//     // Reflect.get 能够把 getter 内部的 this 正确地绑定到 proxyObj 上！
//     // 读取name 的时候，会读取this._name，也会触发劫持
//   },
// });

let person = {
  name: "jw",
  get aliasName() {
    console.log(this);
    return "**" + this.name + "**"; // this -> person
  },
  set aliasName(val) {
    this.name = val;
  },
};
let proxyPerson = new Proxy(person, {
  get(target, key, receiver) {
    console.log("取值", key);
    return Reflect.get(target, key, receiver); //.call
    //return.target[key];//.target is person person.aliasName
  },
});

console.log(proxyPerson.aliasName);
