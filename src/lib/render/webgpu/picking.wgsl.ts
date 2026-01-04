import { wgslCommon } from "./common.wgsl";

export const pickingWgsl = `${wgslCommon}

struct VsOutPick {
  @builtin(position) pos: vec4<f32>,
  @location(0) pickId: u32,
  @location(1) local: vec2<f32>,
  @location(2) halfDev: vec2<f32>,
};

fn pick_id(inst: u32) -> u32 {
  let base = u32(draw.params1.x);
  let perInstance = draw.params0.w > 0.5;
  return select(base, base + inst, perInstance);
}

@vertex
fn vs_marker(
  @location(0) corner: vec2<f32>,
  @location(1) world: vec2<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let size = draw.params0.x;
  let halfDev = vec2<f32>(size * 0.5);
  let center = world_to_device(world);
  let posDev = center + corner * halfDev;
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_rect(
  @location(0) corner: vec2<f32>,
  @location(1) rect: vec4<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let p0 = world_to_device(rect.xy);
  let p1 = world_to_device(rect.xy + rect.zw);
  let minp = vec2<f32>(min(p0.x, p1.x), min(p0.y, p1.y));
  let maxp = vec2<f32>(max(p0.x, p1.x), max(p0.y, p1.y));
  let center = (minp + maxp) * 0.5;
  let halfDev = (maxp - minp) * 0.5;
  let posDev = center + corner * halfDev;
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_stroke(
  @location(0) corner: vec2<f32>,
  @location(1) a: vec2<f32>,
  @location(2) b: vec2<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let aDev = world_to_device(a);
  let bDev = world_to_device(b);
  let dir = bDev - aDev;
  let len = max(length(dir), 1e-6);
  let d = dir / len;
  let n = vec2<f32>(-d.y, d.x);
  let half = draw.params0.x * 0.5;
  let posDev = aDev + d * (corner.x * len) + n * (corner.y * half);
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = vec2<f32>(0.0);
  return out;
}

@fragment
fn fs_pick(in: VsOutPick) -> @location(0) u32 {
  let roundness = draw.params1.y;
  let half = in.halfDev;
  let r = min(half.x, half.y) * roundness;
  let p = in.local * half;
  let d = rect_sdf(p, half, r);
  if (d > 0.0) {
    discard;
  }
  return in.pickId;
}
`;
