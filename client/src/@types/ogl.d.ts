declare module "ogl" {
  export class Renderer {
    constructor(opts?: any);
    gl: any;
    dpr: number;
    setSize(w: number, h: number): void;
    render(params: any): void;
  }
  export class Scene {}
  export class PerspectiveCamera {
    position: any;
  }
  export class Mesh {
    constructor(gl: any, opts?: any);
    setParent(parent: any): void;
  }
  export class Program {
    constructor(gl: any, opts?: any);
  }
  export class Vec3 {}
  export class Vec2 {}
  export class Color {}
  export class Transform {
    position: any;
    scale: any;
    rotation: any;
    setParent(parent: any): void;
  }
  export class Geometry {}
  export class Triangle {
    constructor(gl?: any);
  }
  export class Vec4 {}
  export class Mat4 {}
  export class Texture {}
  export class RenderTarget {}
  export class OGLRenderingContext {}
}
