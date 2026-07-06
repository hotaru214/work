declare module "animejs" {
  export function animate(target: any, params: any): any;
  export function stagger(val: any, opts?: any): any;
  export function splitText(el: any, opts?: any): any;
  export function timeline(params?: any): any;
  export function random(a: number, b: number): number;
  export function setDashoffset(el: any): number;
  export function path(el: any): (val: number) => number;
}
