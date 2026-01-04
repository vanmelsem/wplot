import { wgslCommon } from "./common.wgsl";

export const shadersWgsl = `${wgslCommon}

struct VsOutQuad {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) halfDev: vec2<f32>,
};

@vertex
fn vs_marker(
  @location(0) corner: vec2<f32>,
  @location(1) world: vec2<f32>
) -> VsOutQuad {
  let size = draw.params0.x;
  let halfDev = vec2<f32>(size * 0.5);
  let center = world_to_device(world);
  let posDev = center + corner * halfDev;
  var out: VsOutQuad;
  out.pos = device_to_clip(posDev);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_rect(
  @location(0) corner: vec2<f32>,
  @location(1) rect: vec4<f32>
) -> VsOutQuad {
  let p0 = world_to_device(rect.xy);
  let p1 = world_to_device(rect.xy + rect.zw);
  let minp = vec2<f32>(min(p0.x, p1.x), min(p0.y, p1.y));
  let maxp = vec2<f32>(max(p0.x, p1.x), max(p0.y, p1.y));
  let center = (minp + maxp) * 0.5;
  let halfDev = (maxp - minp) * 0.5;
  let posDev = center + corner * halfDev;
  var out: VsOutQuad;
  out.pos = device_to_clip(posDev);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

struct VsOutStroke {
  @builtin(position) pos: vec4<f32>,
};

struct VsOutTri {
  @builtin(position) pos: vec4<f32>,
};

@vertex
fn vs_stroke(
  @location(0) corner: vec2<f32>,
  @location(1) a: vec2<f32>,
  @location(2) b: vec2<f32>
) -> VsOutStroke {
  let aDev = world_to_device(a);
  let bDev = world_to_device(b);
  let dir = bDev - aDev;
  let len = max(length(dir), 1e-6);
  let d = dir / len;
  let n = vec2<f32>(-d.y, d.x);
  let half = draw.params0.x * 0.5;
  let posDev = aDev + d * (corner.x * len) + n * (corner.y * half);
  var out: VsOutStroke;
  out.pos = device_to_clip(posDev);
  return out;
}

@vertex
fn vs_tris(
  @location(0) pos: vec2<f32>
) -> VsOutTri {
  let dev = world_to_device(pos);
  var out: VsOutTri;
  out.pos = device_to_clip(dev);
  return out;
}

@fragment
fn fs_quad(in: VsOutQuad) -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  let fill = vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
  let stroke = vec4<f32>(draw.stroke.rgb, draw.stroke.a * opacity);
  let strokeW = draw.params0.y;
  let roundness = draw.params1.y;
  let half = in.halfDev;
  let r = min(half.x, half.y) * roundness;
  let p = in.local * half;
  let d = rect_sdf(p, half, r);
  let aa = max(fwidth(d), 0.5);
  let outer = smoothstep(0.0, aa, d);
  let inner = smoothstep(0.0, aa, d + strokeW);
  let fillAlpha = 1.0 - inner;
  let strokeAlpha = max(inner - outer, 0.0);
  return fill * fillAlpha + stroke * strokeAlpha;
}

@fragment
fn fs_stroke() -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  return vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
}

@fragment
fn fs_tris() -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  return vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
}

// heatmap pipeline removed in minimal primitive set
`;
