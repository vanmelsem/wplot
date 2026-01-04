export const wgslCommon = `struct ViewUbo {
  v0: vec4<f32>,
  v1: vec4<f32>,
  v2: vec4<f32>,
};

struct DrawUbo {
  fill: vec4<f32>,
  stroke: vec4<f32>,
  params0: vec4<f32>, // size, strokeWidth, opacity, pickFlags
  params1: vec4<f32>, // pickBase, roundness, unused...
};

@group(0) @binding(0) var<uniform> view: ViewUbo;
@group(1) @binding(0) var<uniform> draw: DrawUbo;

fn world_to_device(p: vec2<f32>) -> vec2<f32> {
  let worldMin = vec2<f32>(view.v1.z, view.v1.w);
  let worldSpan = vec2<f32>(view.v2.x, view.v2.y);
  let origin = vec2<f32>(view.v2.z, view.v2.w);
  let plotOrigin = vec2<f32>(view.v0.z, view.v0.w);
  let plotSize = vec2<f32>(view.v1.x, view.v1.y);
  let pRel = p - origin;
  let worldMinRel = worldMin - origin;
  let t = (pRel - worldMinRel) / worldSpan;
  let px = plotOrigin.x + t.x * plotSize.x;
  let py = plotOrigin.y + (1.0 - t.y) * plotSize.y;
  return vec2<f32>(px, py);
}

fn device_to_clip(p: vec2<f32>) -> vec4<f32> {
  let canvas = vec2<f32>(view.v0.x, view.v0.y);
  let ndc = vec2<f32>(
    (p.x / canvas.x) * 2.0 - 1.0,
    1.0 - (p.y / canvas.y) * 2.0
  );
  return vec4<f32>(ndc, 0.0, 1.0);
}

fn rect_sdf(p: vec2<f32>, half: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - (half - vec2<f32>(r));
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}
`;
