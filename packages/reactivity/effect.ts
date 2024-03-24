import { Dep, createDep } from "./dep";

type keyToDepMap = Map<any, Dep>;
const targetMap = new WeakMap<any, keyToDepMap>();

export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any> {
  constructor(public fn: () => T) { }

  run() {
    /**
     * fnを実行する前の activeEffect を保持していて、実行が終わった後元に戻す
     * これをやらないと、どんどん上書きしてしまって、意図しない挙動をしてしまう
     */
    let parent: ReactiveEffect | undefined = activeEffect;
    activeEffect = this;
    const res = this.fn();
    activeEffect = parent;
    return res;
  }
}

export function track(target: Object, key: unknown) {
  // targetMap に既に登録済みのtargetか確認、なければ新しく作る
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }

  // targetMap['target'][key] に登録があるか確認、なければ新しく作る
  let dep = depsMap?.get(key);
  if (!dep) {
    depsMap.set(key, (dep = createDep()));
  }

  // activeEffect があれば登録する
  if (activeEffect) {
    dep.add(activeEffect);
  }
}

export function trigger(target: object, key?: unknown) {
  // targetMap に 引数の target が登録されているか確認、なければ何もしない
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  // targetMap['target']['key'] に登録してある 作用 (dep) を走らせる
  const dep = depsMap.get(key);
  if (dep) {
    const effects = [...dep];
    for (const effect of effects) {
      effect.run();
    }
  }
} 