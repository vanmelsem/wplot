/// <reference types="@webgpu/types" />
//
// WebGPU heatmap renderer. Uploads the grid as an r32float texture and the
// colormap as a 1D rgba8 LUT, then draws a fullscreen triangle whose fragment
// shader maps each pixel -> data-rect UV -> texel -> colormap color, discarding
// outside the data rect / plot bounds. A per-frame uniform carries the projected
// transform and value range, so the raster stays pixel-perfect on pan/zoom.
//
// This path is only reachable in a real browser with WebGPU; it is feature-
// detected and degrades to the Canvas-2D fallback (never throws) if init fails.

import type { Layer, LayerFrame } from "../../core/runtime/dom_runtime";
import { createCanvas2dHeatmapLayer } from "./canvas2d";
import { buildColormapLut, viridis } from "./colormap";
import { inferValueRange, projectDataRect } from "./math";
import { ensureBackingSize } from "./surface";
import type { HeatmapData } from "./types";

/** True when the host exposes the WebGPU entry point. */
export function isWebgpuAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

let warned = false;
function warnFallbackOnce(reason: string): void {
  if (warned) return;
  warned = true;
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[wplot/heatmap] WebGPU unavailable (${reason}); using Canvas-2D fallback.`,
    );
  }
}

const SHADER = /* wgsl */ `
struct Uniforms {
  rect : vec4<f32>,
  bounds : vec4<f32>,
  range : vec4<f32>,
};
@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var valueTex : texture_2d<f32>;
@group(0) @binding(2) var valueSamp : sampler;
@group(0) @binding(3) var lutTex : texture_2d<f32>;
@group(0) @binding(4) var lutSamp : sampler;

struct VsOut {
  @builtin(position) pos : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VsOut {
  var corners = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var out : VsOut;
  out.pos = vec4<f32>(corners[vi], 0.0, 1.0);
  return out;
}

@fragment
fn fs(@builtin(position) frag : vec4<f32>) -> @location(0) vec4<f32> {
  let px = frag.x;
  let py = frag.y;
  var visible = true;
  if (px < u.bounds.x || px > u.bounds.x + u.bounds.z ||
      py < u.bounds.y || py > u.bounds.y + u.bounds.w) {
    visible = false;
  }
  let uu = (px - u.rect.x) / u.rect.z;
  let vv = (py - u.rect.y) / u.rect.w;
  if (uu < 0.0 || uu > 1.0 || vv < 0.0 || vv > 1.0) {
    visible = false;
  }
  if (!visible) {
    discard;
  }
  let raw = textureSample(valueTex, valueSamp, vec2<f32>(uu, vv)).r;
  let span = max(u.range.y - u.range.x, 1e-20);
  let t = clamp((raw - u.range.x) / span, 0.0, 1.0);
  return textureSample(lutTex, lutSamp, vec2<f32>(t, 0.5));
}
`;

type GpuState = {
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  uniformBuffer: GPUBuffer;
  uniformData: Float32Array<ArrayBuffer>;
};

async function initGpu(
  canvas: HTMLCanvasElement,
  data: HeatmapData,
): Promise<GpuState> {
  const gpu = navigator.gpu;
  if (!gpu) throw new Error("no navigator.gpu");

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error("no adapter");

  const wantLinear = (data.sampling ?? "nearest") === "linear";
  const canFilterFloat = adapter.features.has("float32-filterable");
  const useFloatFilter = wantLinear && canFilterFloat;
  const device = await adapter.requestDevice(
    useFloatFilter ? { requiredFeatures: ["float32-filterable"] } : {},
  );

  // From here on we touch the canvas; keep failures contained to the caller's
  // catch so it can degrade to Canvas-2D.
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("no webgpu context");
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "premultiplied" });

  const range = inferValueRange(data.values, data.valueMin, data.valueMax);
  const colormap = data.colormap ?? viridis;

  // Value grid -> r32float texture.
  const valueTex = device.createTexture({
    size: { width: data.cols, height: data.rows },
    format: "r32float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture: valueTex },
    data.values as Float32Array<ArrayBuffer>,
    { bytesPerRow: data.cols * 4, rowsPerImage: data.rows },
    { width: data.cols, height: data.rows },
  );

  // Colormap -> 1D rgba8 LUT texture.
  const lutSize = 256;
  const lutTex = device.createTexture({
    size: { width: lutSize, height: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture: lutTex },
    buildColormapLut(colormap, lutSize),
    { bytesPerRow: lutSize * 4, rowsPerImage: 1 },
    { width: lutSize, height: 1 },
  );

  const valueSamp = device.createSampler(
    useFloatFilter
      ? { magFilter: "linear", minFilter: "linear" }
      : { magFilter: "nearest", minFilter: "nearest" },
  );
  const lutSamp = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: useFloatFilter ? "float" : "unfilterable-float",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: useFloatFilter ? "filtering" : "non-filtering" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
    ],
  });

  const module = device.createShaderModule({ code: SHADER });
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: { module, entryPoint: "vs" },
    fragment: { module, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const uniformData = new Float32Array(12);
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: valueTex.createView() },
      { binding: 2, resource: valueSamp },
      { binding: 3, resource: lutTex.createView() },
      { binding: 4, resource: lutSamp },
    ],
  });

  return { device, context, pipeline, bindGroup, uniformBuffer, uniformData };
}

export function createWebgpuHeatmapLayer(
  data: HeatmapData,
  onReady?: () => void,
): Layer {
  const range = inferValueRange(data.values, data.valueMin, data.valueMax);

  let state: GpuState | null = null;
  let initStarted = false;
  let failed = false;
  let fallback: Layer | null = null;

  function ensureInit(canvas: HTMLCanvasElement): void {
    if (initStarted) return;
    initStarted = true;
    initGpu(canvas, data)
      .then((s) => {
        state = s;
        // The device became ready after the first (empty) frame; ask the host
        // to repaint so the heatmap appears without a pointer event.
        onReady?.();
      })
      .catch((err) => {
        failed = true;
        warnFallbackOnce(err instanceof Error ? err.message : String(err));
        onReady?.();
      });
  }

  return {
    draw(frame: LayerFrame): void {
      if (failed) {
        // Init never touched the canvas (device acquired first), so a fresh 2D
        // context is still attachable.
        if (!fallback) fallback = createCanvas2dHeatmapLayer(data);
        fallback.draw(frame);
        return;
      }

      ensureInit(frame.canvas);
      const gpu = state;
      if (!gpu) return; // device still initializing this frame

      const { deviceW, deviceH } = ensureBackingSize(frame.canvas, frame.dpr);
      const dpr = frame.dpr > 0 ? frame.dpr : 1;
      const rect = projectDataRect(data, frame.valueToPx);

      const u = gpu.uniformData;
      // rect (device px)
      u[0] = rect.left * dpr;
      u[1] = rect.top * dpr;
      u[2] = rect.width * dpr || 1;
      u[3] = rect.height * dpr || 1;
      // bounds (device px)
      u[4] = frame.bounds.origin.x * dpr;
      u[5] = frame.bounds.origin.y * dpr;
      u[6] = frame.bounds.size.width * dpr;
      u[7] = frame.bounds.size.height * dpr;
      // value range
      u[8] = range.min;
      u[9] = range.max;
      u[10] = 0;
      u[11] = 0;
      gpu.device.queue.writeBuffer(gpu.uniformBuffer, 0, u);

      void deviceW;
      void deviceH;
      const encoder = gpu.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: gpu.context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(gpu.pipeline);
      pass.setBindGroup(0, gpu.bindGroup);
      pass.draw(3);
      pass.end();
      gpu.device.queue.submit([encoder.finish()]);
    },
  };
}
