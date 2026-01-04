import { Scene, Primitive } from "../../../core/scene";
import { shadersWgsl } from "./shaders.wgsl";
import { pickingWgsl } from "./picking.wgsl";

export type GpuContext = {
  device: GPUDevice;
  queue: GPUQueue;
  format: GPUTextureFormat;
  context: GPUCanvasContext;
  timestampPeriod: number;
};

export async function createGpuContext(
  canvas: HTMLCanvasElement,
): Promise<GpuContext | null> {
  if (!("gpu" in navigator)) return null;
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const features: GPUFeatureName[] = [];
  if (adapter.features.has("timestamp-query")) {
    features.push("timestamp-query");
  }
  const device = await adapter.requestDevice({ requiredFeatures: features });
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "premultiplied" });
  const timestampPeriod =
    (device as any).limits?.timestampPeriod ??
    (device.queue as any).getTimestampPeriod?.() ??
    0;
  return { device, queue: device.queue, format, context, timestampPeriod };
}

const DRAW_FLOATS = 16;

type BufferCacheEntry = {
  buffer: GPUBuffer;
  capacity: number;
  revision: number;
  count?: number;
  segments?: Float32Array;
};

class BufferCache {
  private map = new Map<number, BufferCacheEntry>();

  clear(): void {
    for (const entry of this.map.values()) entry.buffer.destroy();
    this.map.clear();
  }

  get(
    device: GPUDevice,
    key: number,
    bytes: number,
    revision: number,
  ): { buffer: GPUBuffer; write: boolean; entry: BufferCacheEntry } {
    const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    let entry = this.map.get(key);
    const needsResize = !entry || entry.capacity < bytes;
    const needsWrite = !entry || needsResize || entry.revision !== revision;
    if (!entry || needsResize) {
      const next = Math.max(bytes, entry?.capacity ? entry.capacity * 2 : 1024);
      const buffer = device.createBuffer({ size: next, usage });
      entry = { buffer, capacity: next, revision };
      this.map.set(key, entry);
    } else if (entry.revision !== revision) {
      entry.revision = revision;
    }
    return { buffer: entry.buffer, write: needsWrite, entry };
  }
}

export class WebGpuRenderer {
  private gpu: GpuContext | null = null;
  private ready = false;

  private viewBuffer: GPUBuffer | null = null;
  private drawBuffer: GPUBuffer | null = null;
  private viewBindGroup: GPUBindGroup | null = null;
  private drawBindGroup: GPUBindGroup | null = null;
  private viewBindGroupLayout: GPUBindGroupLayout | null = null;
  private drawBindGroupLayout: GPUBindGroupLayout | null = null;
  private drawBuffers: GPUBuffer[] = [];
  private drawBindGroups: GPUBindGroup[] = [];
  private drawIndex = 0;

  private pipelineMarker: GPURenderPipeline | null = null;
  private pipelineRect: GPURenderPipeline | null = null;
  private pipelineStroke: GPURenderPipeline | null = null;
  private pipelineTris: GPURenderPipeline | null = null;
  private pickPipelineMarker: GPURenderPipeline | null = null;
  private pickPipelineRect: GPURenderPipeline | null = null;
  private pickPipelineStroke: GPURenderPipeline | null = null;

  private quadBuffer: GPUBuffer | null = null;
  private strokeCornerBuffer: GPUBuffer | null = null;
  private quadIndex: GPUBuffer | null = null;

  private markerBuffers: GPUBuffer[] = [];
  private markerCaps: number[] = [];
  private rectBuffers: GPUBuffer[] = [];
  private rectCaps: number[] = [];
  private strokeBuffers: GPUBuffer[] = [];
  private strokeCaps: number[] = [];
  private trisBuffers: GPUBuffer[] = [];
  private trisCaps: number[] = [];
  private markerCache = new BufferCache();
  private rectCache = new BufferCache();
  private strokeCache = new BufferCache();
  private trisCache = new BufferCache();
  private markerIndex = 0;
  private rectIndex = 0;
  private strokeIndex = 0;
  private trisIndex = 0;

  private pickTexture: GPUTexture | null = null;
  private pickView: GPUTextureView | null = null;
  private pickSize = { w: 0, h: 0 };
  private pickTexSize = { w: 0, h: 0 };
  private pickReadBuffer: GPUBuffer | null = null;
  private pickRequest: { x: number; y: number; dpr: number } | null = null;
  private pickPending = false;
  private lastPickId = 0;
  private lastGpuMs = 0;
  private gpuPending = false;
  private timestampSupported = false;
  private timestampPeriod = 0;
  private timestampQuerySet: GPUQuerySet | null = null;
  private timestampResolveBuffer: GPUBuffer | null = null;
  private timestampReadBuffer: GPUBuffer | null = null;
  private timestampPending = false;

  private viewUniform = new Float32Array(12);
  private drawUniform = new Float32Array(DRAW_FLOATS);
  private segmentScratch: Float32Array = new Float32Array(0);

  constructor(gpu: GpuContext | null) {
    if (gpu) this.setGpu(gpu);
  }

  setGpu(gpu: GpuContext): void {
    this.clearCachedBuffers();
    this.gpu = gpu;
    this.timestampPeriod = gpu.timestampPeriod ?? 0;
    this.timestampSupported = this.timestampPeriod > 0;
    this.lastGpuMs = this.timestampSupported ? 0 : -1;
    this.init();
  }

  requestPick(sx: number, sy: number, dpr: number): void {
    this.pickRequest = { x: sx, y: sy, dpr };
  }

  getPickId(): number {
    return this.lastPickId;
  }

  isPickPending(): boolean {
    return this.pickPending;
  }

  getGpuMs(): number {
    return this.lastGpuMs;
  }

  render(scene: Scene): void {
    if (!this.ready || !this.gpu) return;
    const { device, queue, context } = this.gpu;
    this.updateView(scene);
    this.drawIndex = 0;
    this.markerIndex = 0;
    this.rectIndex = 0;
    this.strokeIndex = 0;
    this.trisIndex = 0;

    const view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder();
    const passDesc: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: {
            r: scene.background[0],
            g: scene.background[1],
            b: scene.background[2],
            a: scene.background[3],
          },
        },
      ],
    };
    if (this.timestampSupported && this.timestampQuerySet) {
      (passDesc as any).timestampWrites = {
        querySet: this.timestampQuerySet,
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1,
      };
    }
    const pass = encoder.beginRenderPass(passDesc);

    pass.setBindGroup(0, this.viewBindGroup!);
    this.setPlotScissor(pass, scene);
    this.drawList(pass, scene.grid, scene.viewport.dpr, false);
    this.drawList(pass, scene.series, scene.viewport.dpr, false);
    this.drawList(pass, scene.items, scene.viewport.dpr, false);
    this.drawList(pass, scene.overlays, scene.viewport.dpr, false);

    pass.end();

    if (
      this.timestampSupported &&
      this.timestampQuerySet &&
      this.timestampResolveBuffer &&
      this.timestampReadBuffer
    ) {
      encoder.resolveQuerySet(
        this.timestampQuerySet,
        0,
        2,
        this.timestampResolveBuffer,
        0,
      );
      encoder.copyBufferToBuffer(
        this.timestampResolveBuffer,
        0,
        this.timestampReadBuffer,
        0,
        16,
      );
    }

    queue.submit([encoder.finish()]);
    if (this.timestampSupported) {
      this.scheduleGpuRead();
    } else {
      this.lastGpuMs = -1;
    }
  }

  renderPicking(scene: Scene): void {
    if (!this.ready || !this.gpu) return;
    if (!this.pickRequest) return;
    if (this.pickPending) return;
    const { device, queue } = this.gpu;
    this.updateView(scene);
    this.drawIndex = 0;
    this.markerIndex = 0;
    this.rectIndex = 0;
    this.strokeIndex = 0;
    this.trisIndex = 0;
    this.ensurePickTexture();
    if (!this.pickView) return;

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.pickView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });

    pass.setBindGroup(0, this.viewBindGroup!);
    this.setPlotScissor(pass, scene);
    this.drawList(pass, scene.grid, scene.viewport.dpr, true);
    this.drawList(pass, scene.series, scene.viewport.dpr, true);
    this.drawList(pass, scene.items, scene.viewport.dpr, true);
    this.drawList(pass, scene.overlays, scene.viewport.dpr, true);

    pass.end();

    this.copyPickPixel(encoder);
    queue.submit([encoder.finish()]);
    this.schedulePickRead();
  }

  dispose(): void {
    this.pickTexture?.destroy();
    this.pickTexture = null;
    this.pickView = null;
    this.pickReadBuffer?.destroy();
    this.pickReadBuffer = null;
    this.drawBuffer?.destroy();
    this.viewBuffer?.destroy();
    this.timestampQuerySet?.destroy();
    this.timestampResolveBuffer?.destroy();
    this.timestampReadBuffer?.destroy();
    this.timestampQuerySet = null;
    this.timestampResolveBuffer = null;
    this.timestampReadBuffer = null;
    for (const buf of this.drawBuffers) buf.destroy();
    this.drawBuffers = [];
    this.drawBindGroups = [];
    for (const buf of this.markerBuffers) buf.destroy();
    for (const buf of this.rectBuffers) buf.destroy();
    for (const buf of this.strokeBuffers) buf.destroy();
    for (const buf of this.trisBuffers) buf.destroy();
    this.markerBuffers = [];
    this.rectBuffers = [];
    this.strokeBuffers = [];
    this.trisBuffers = [];
    this.markerCaps = [];
    this.rectCaps = [];
    this.strokeCaps = [];
    this.trisCaps = [];
    this.clearCachedBuffers();
  }

  private clearCachedBuffers(): void {
    this.markerCache.clear();
    this.rectCache.clear();
    this.strokeCache.clear();
    this.trisCache.clear();
  }

  private init(): void {
    if (!this.gpu || this.ready) return;
    const { device, format } = this.gpu;

    const viewLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    const drawLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    this.viewBindGroupLayout = viewLayout;
    this.drawBindGroupLayout = drawLayout;

    const layout = device.createPipelineLayout({
      bindGroupLayouts: [viewLayout, drawLayout],
    });

    this.viewBuffer = device.createBuffer({
      size: this.viewUniform.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.drawBuffer = device.createBuffer({
      size: this.drawUniform.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.viewBindGroup = device.createBindGroup({
      layout: viewLayout,
      entries: [{ binding: 0, resource: { buffer: this.viewBuffer } }],
    });
    this.drawBindGroup = device.createBindGroup({
      layout: drawLayout,
      entries: [{ binding: 0, resource: { buffer: this.drawBuffer } }],
    });

    const shader = device.createShaderModule({ code: shadersWgsl });
    const pickShader = device.createShaderModule({ code: pickingWgsl });

    const blend: GPUBlendState = {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
    };

    const quadVerts = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    this.quadBuffer = device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.quadBuffer, 0, quadVerts);

    const strokeVerts = new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]);
    this.strokeCornerBuffer = device.createBuffer({
      size: strokeVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.strokeCornerBuffer, 0, strokeVerts);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this.quadIndex = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.quadIndex, 0, indices);

    const markerBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
      },
      {
        arrayStride: 8,
        stepMode: "instance",
        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x2" }],
      },
    ];

    const rectBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
      },
      {
        arrayStride: 16,
        stepMode: "instance",
        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x4" }],
      },
    ];

    const strokeBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
      },
      {
        arrayStride: 16,
        stepMode: "instance",
        attributes: [
          { shaderLocation: 1, offset: 0, format: "float32x2" },
          { shaderLocation: 2, offset: 8, format: "float32x2" },
        ],
      },
    ];

    this.pipelineMarker = device.createRenderPipeline({
      layout,
      vertex: {
        module: shader,
        entryPoint: "vs_marker",
        buffers: markerBuffers,
      },
      fragment: {
        module: shader,
        entryPoint: "fs_quad",
        targets: [{ format, blend }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pipelineRect = device.createRenderPipeline({
      layout,
      vertex: { module: shader, entryPoint: "vs_rect", buffers: rectBuffers },
      fragment: {
        module: shader,
        entryPoint: "fs_quad",
        targets: [{ format, blend }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pipelineTris = device.createRenderPipeline({
      layout,
      vertex: {
        module: shader,
        entryPoint: "vs_tris",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
      },
      fragment: {
        module: shader,
        entryPoint: "fs_tris",
        targets: [{ format, blend }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pipelineStroke = device.createRenderPipeline({
      layout,
      vertex: {
        module: shader,
        entryPoint: "vs_stroke",
        buffers: strokeBuffers,
      },
      fragment: {
        module: shader,
        entryPoint: "fs_stroke",
        targets: [{ format, blend }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pickPipelineMarker = device.createRenderPipeline({
      layout,
      vertex: {
        module: pickShader,
        entryPoint: "vs_marker",
        buffers: markerBuffers,
      },
      fragment: {
        module: pickShader,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pickPipelineRect = device.createRenderPipeline({
      layout,
      vertex: {
        module: pickShader,
        entryPoint: "vs_rect",
        buffers: rectBuffers,
      },
      fragment: {
        module: pickShader,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.pickPipelineStroke = device.createRenderPipeline({
      layout,
      vertex: {
        module: pickShader,
        entryPoint: "vs_stroke",
        buffers: strokeBuffers,
      },
      fragment: {
        module: pickShader,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });

    if (this.timestampSupported) {
      this.timestampQuerySet = device.createQuerySet({
        type: "timestamp",
        count: 2,
      });
      this.timestampResolveBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
      this.timestampReadBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

    this.ready = true;
  }

  private updateView(scene: Scene): void {
    if (!this.gpu || !this.viewBuffer) return;
    const dpr = scene.viewport.dpr || 1;
    const canvasDevW = Math.max(
      1,
      Math.round(scene.viewport.canvas.width * dpr),
    );
    const canvasDevH = Math.max(
      1,
      Math.round(scene.viewport.canvas.height * dpr),
    );
    const plotDevX = scene.viewport.plot.origin.x * dpr;
    const plotDevY = scene.viewport.plot.origin.y * dpr;
    const plotDevW = scene.viewport.plot.size.width * dpr;
    const plotDevH = scene.viewport.plot.size.height * dpr;
    const worldMinX = scene.viewport.world.x.min;
    const worldMinY = scene.viewport.world.y.min;
    const worldSpanX = scene.viewport.world.x.max - worldMinX || 1;
    const worldSpanY = scene.viewport.world.y.max - worldMinY || 1;
    const origin = scene.renderOrigin ?? {
      x: worldMinX + worldSpanX * 0.5,
      y: worldMinY + worldSpanY * 0.5,
    };

    this.viewUniform[0] = canvasDevW;
    this.viewUniform[1] = canvasDevH;
    this.viewUniform[2] = plotDevX;
    this.viewUniform[3] = plotDevY;
    this.viewUniform[4] = plotDevW;
    this.viewUniform[5] = plotDevH;
    this.viewUniform[6] = worldMinX;
    this.viewUniform[7] = worldMinY;
    this.viewUniform[8] = worldSpanX;
    this.viewUniform[9] = worldSpanY;
    this.viewUniform[10] = origin.x;
    this.viewUniform[11] = origin.y;

    this.writeBuffer(this.viewBuffer, this.viewUniform);

    this.pickSize.w = canvasDevW;
    this.pickSize.h = canvasDevH;
  }

  private ensurePickTexture(): void {
    if (!this.gpu) return;
    const { device } = this.gpu;
    const w = this.pickSize.w;
    const h = this.pickSize.h;
    if (!w || !h) return;
    if (
      this.pickTexture &&
      this.pickTexSize.w === w &&
      this.pickTexSize.h === h
    ) {
      if (this.pickView) return;
    }
    this.pickTexture?.destroy();
    this.pickTexture = device.createTexture({
      size: { width: w, height: h },
      format: "r32uint",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    this.pickView = this.pickTexture.createView();
    this.pickTexSize.w = w;
    this.pickTexSize.h = h;
  }

  private setPlotScissor(pass: GPURenderPassEncoder, scene: Scene): void {
    const dpr = scene.viewport.dpr || 1;
    const x = Math.max(0, Math.floor(scene.viewport.plot.origin.x * dpr));
    const y = Math.max(0, Math.floor(scene.viewport.plot.origin.y * dpr));
    const w = Math.max(1, Math.ceil(scene.viewport.plot.size.width * dpr));
    const h = Math.max(1, Math.ceil(scene.viewport.plot.size.height * dpr));
    pass.setScissorRect(x, y, w, h);
  }

  private ensurePickReadBuffer(): void {
    if (!this.gpu) return;
    if (this.pickReadBuffer) return;
    this.pickReadBuffer = this.gpu.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }

  private copyPickPixel(encoder: GPUCommandEncoder): void {
    if (!this.gpu || !this.pickTexture || !this.pickRequest) return;
    this.ensurePickReadBuffer();
    if (!this.pickReadBuffer) return;
    const { x, y, dpr } = this.pickRequest;
    const px = Math.min(
      Math.max(0, Math.floor(x * dpr)),
      Math.max(0, this.pickSize.w - 1),
    );
    const py = Math.min(
      Math.max(0, Math.floor(y * dpr)),
      Math.max(0, this.pickSize.h - 1),
    );
    encoder.copyTextureToBuffer(
      { texture: this.pickTexture, origin: { x: px, y: py } },
      { buffer: this.pickReadBuffer, bytesPerRow: 256 },
      { width: 1, height: 1, depthOrArrayLayers: 1 },
    );
    this.pickRequest = null;
  }

  private schedulePickRead(): void {
    if (!this.gpu || !this.pickReadBuffer || this.pickPending) return;
    this.pickPending = true;
    this.gpu.queue
      .onSubmittedWorkDone()
      .then(() => this.pickReadBuffer!.mapAsync(GPUMapMode.READ))
      .then(() => {
        const data = new Uint32Array(this.pickReadBuffer!.getMappedRange());
        this.lastPickId = data[0] ?? 0;
        this.pickReadBuffer!.unmap();
      })
      .catch(() => {})
      .finally(() => {
        this.pickPending = false;
      });
  }

  private scheduleGpuRead(): void {
    if (!this.gpu || !this.timestampReadBuffer || this.timestampPending) return;
    this.timestampPending = true;
    const period = this.timestampPeriod;
    this.gpu.queue
      .onSubmittedWorkDone()
      .then(() => this.timestampReadBuffer!.mapAsync(GPUMapMode.READ))
      .then(() => {
        const data = new BigUint64Array(
          this.timestampReadBuffer!.getMappedRange(),
        );
        const start = data[0] ?? 0n;
        const end = data[1] ?? 0n;
        this.timestampReadBuffer!.unmap();
        if (end >= start && period > 0) {
          const delta = Number(end - start);
          this.lastGpuMs = (delta * period) / 1e6;
        } else {
          this.lastGpuMs = 0;
        }
      })
      .catch(() => {})
      .finally(() => {
        this.timestampPending = false;
      });
  }

  private drawList(
    pass: GPURenderPassEncoder,
    list: readonly Primitive[],
    dpr: number,
    picking: boolean,
  ) {
    for (const prim of list) {
      switch (prim.kind) {
        case "quad":
          if (prim.mode === "marker") {
            this.drawQuadMarkers(pass, prim, dpr, picking);
          } else {
            this.drawQuadRects(pass, prim, dpr, picking);
          }
          break;
        case "path":
          this.drawPaths(pass, prim, dpr, picking);
          break;
        case "mesh":
          this.drawMesh(pass, prim, dpr, picking);
          break;
        default:
          break;
      }
    }
  }

  private drawQuadMarkers(
    pass: GPURenderPassEncoder,
    prim: Extract<Primitive, { kind: "quad"; mode: "marker" }>,
    dpr: number,
    picking: boolean,
  ) {
    const sizePx = picking ? Math.max(prim.sizePx, 4) : prim.sizePx;
    this.drawInstancedQuad({
      pass,
      data: prim.centers,
      dataBytes: prim.centers.byteLength,
      primCount: prim.count,
      draw: prim.draw,
      resourceKey: prim.resourceKey,
      revision: prim.revision,
      cache: this.markerCache,
      bufferKind: "marker",
      pipeline: this.pipelineMarker!,
      pickPipeline: this.pickPipelineMarker!,
      uniform: {
        fill: prim.fill,
        stroke: prim.stroke,
        sizePx,
        strokeWidthPx: prim.strokeWidthPx,
        opacity: prim.opacity,
        roundness: prim.roundness,
        pick: prim.pick,
      },
      dpr,
      picking,
    });
  }

  private drawQuadRects(
    pass: GPURenderPassEncoder,
    prim: Extract<Primitive, { kind: "quad"; mode: "rect" }>,
    dpr: number,
    picking: boolean,
  ) {
    this.drawInstancedQuad({
      pass,
      data: prim.rects,
      dataBytes: prim.rects.byteLength,
      primCount: prim.count,
      draw: prim.draw,
      resourceKey: prim.resourceKey,
      revision: prim.revision,
      cache: this.rectCache,
      bufferKind: "rect",
      pipeline: this.pipelineRect!,
      pickPipeline: this.pickPipelineRect!,
      uniform: {
        fill: prim.fill,
        stroke: prim.stroke,
        sizePx: 0,
        strokeWidthPx: prim.strokeWidthPx,
        opacity: prim.opacity,
        roundness: prim.roundness,
        pick: prim.pick,
      },
      dpr,
      picking,
    });
  }

  private drawInstancedQuad(args: {
    pass: GPURenderPassEncoder;
    data: Float32Array;
    dataBytes: number;
    primCount: number;
    draw?: { start: number; count: number };
    resourceKey?: number;
    revision?: number;
    cache: BufferCache;
    bufferKind: "marker" | "rect";
    pipeline: GPURenderPipeline;
    pickPipeline: GPURenderPipeline;
    uniform: {
      fill: readonly [number, number, number, number];
      stroke: readonly [number, number, number, number];
      sizePx: number;
      strokeWidthPx: number;
      opacity: number;
      roundness: number;
      pick?: { idBase: number; perInstance?: true };
    };
    dpr: number;
    picking: boolean;
  }): void {
    if (!this.gpu) return;
    const count = args.primCount;
    if (count <= 0) return;
    if (args.picking && !args.uniform.pick) return;
    let drawStart = args.draw?.start ?? 0;
    let drawCount = args.draw?.count ?? count;
    if (drawStart < 0) drawStart = 0;
    if (drawStart >= count) return;
    if (drawCount > count - drawStart) drawCount = count - drawStart;
    if (drawCount <= 0) return;
    let buffer: GPUBuffer;
    if (args.resourceKey != null && args.revision != null) {
      const cached = this.getCachedBuffer(
        args.cache,
        args.resourceKey,
        args.dataBytes,
        args.revision,
      );
      buffer = cached.buffer;
      if (cached.write) this.writeBuffer(buffer, args.data);
    } else {
      buffer = this.ensureGeomBuffer(
        args.bufferKind,
        args.bufferKind === "marker" ? this.markerIndex++ : this.rectIndex++,
        args.dataBytes,
      );
      this.writeBuffer(buffer, args.data);
    }

    const bindGroup = this.writeDrawUniform({
      fill: args.uniform.fill,
      stroke: args.uniform.stroke,
      size: args.uniform.sizePx * args.dpr,
      strokeWidth: args.uniform.strokeWidthPx * args.dpr,
      opacity: args.uniform.opacity,
      roundness: args.uniform.roundness,
      pick: args.uniform.pick,
    });

    args.pass.setPipeline(args.picking ? args.pickPipeline : args.pipeline);
    args.pass.setBindGroup(1, bindGroup);
    args.pass.setVertexBuffer(0, this.quadBuffer!);
    args.pass.setVertexBuffer(1, buffer);
    args.pass.setIndexBuffer(this.quadIndex!, "uint16");
    args.pass.drawIndexed(6, drawCount, 0, 0, drawStart);
  }

  private drawPaths(
    pass: GPURenderPassEncoder,
    prim: Extract<Primitive, { kind: "path" }>,
    dpr: number,
    picking: boolean,
  ) {
    if (!this.gpu) return;
    if (prim.count < 2) return;
    if (picking) return;
    let buffer: GPUBuffer;
    let drawStart = prim.draw?.start ?? 0;
    let drawCount = prim.draw?.count ?? prim.count;
    if (drawStart < 0) drawStart = 0;
    if (drawStart >= prim.count) return;
    if (drawCount > prim.count - drawStart) drawCount = prim.count - drawStart;
    if (drawCount < 2) return;
    const rangeSegments = drawCount - 1;
    if (rangeSegments <= 0) return;
    let firstSegment = drawStart;
    let segCount = rangeSegments;
    if (prim.dynamic && prim.draw) {
      firstSegment = 0;
      segCount = rangeSegments;
      if (prim.resourceKey != null && prim.revision != null) {
        const bytes = prim.bufferBytes ?? rangeSegments * 4 * 4;
        const cached = this.getCachedBuffer(
          this.strokeCache,
          prim.resourceKey,
          bytes,
          prim.revision,
        );
        buffer = cached.buffer;
        const segData = this.ensureSegmentScratch(rangeSegments * 4);
        this.fillSegments(prim.points, drawStart, rangeSegments, segData);
        this.writeBuffer(buffer, segData.subarray(0, rangeSegments * 4));
        cached.entry.count = rangeSegments;
      } else {
        const segData = this.ensureSegmentScratch(rangeSegments * 4);
        this.fillSegments(prim.points, drawStart, rangeSegments, segData);
        buffer = this.ensureGeomBuffer(
          "stroke",
          this.strokeIndex++,
          segData.byteLength,
        );
        this.writeBuffer(buffer, segData.subarray(0, rangeSegments * 4));
      }
    } else {
      const totalPoints = prim.count;
      const segments = totalPoints - 1;
      if (firstSegment < 0) firstSegment = 0;
      if (firstSegment > segments - 1) return;
      if (segCount > segments - firstSegment)
        segCount = segments - firstSegment;
      if (segCount <= 0) return;
      if (prim.resourceKey != null && prim.revision != null) {
        const bytes = prim.bufferBytes ?? segments * 4 * 4;
        const cached = this.getCachedBuffer(
          this.strokeCache,
          prim.resourceKey,
          bytes,
          prim.revision,
        );
        buffer = cached.buffer;
        if (cached.write || prim.dynamic) {
          const segData = this.ensureSegmentScratch(segments * 4);
          this.fillSegments(prim.points, 0, segments, segData);
          this.writeBuffer(buffer, segData.subarray(0, segments * 4));
          cached.entry.count = segments;
        }
      } else {
        const segData = this.ensureSegmentScratch(segments * 4);
        this.fillSegments(prim.points, 0, segments, segData);
        buffer = this.ensureGeomBuffer(
          "stroke",
          this.strokeIndex++,
          segData.byteLength,
        );
        this.writeBuffer(buffer, segData.subarray(0, segments * 4));
      }
    }

    const bindGroup = this.writeDrawUniform({
      fill: prim.color,
      stroke: prim.color,
      size: prim.widthPx * dpr,
      strokeWidth: 0,
      opacity: prim.opacity,
      pick: undefined,
    });

    pass.setPipeline(this.pipelineStroke!);
    pass.setBindGroup(1, bindGroup);
    pass.setVertexBuffer(0, this.strokeCornerBuffer!);
    pass.setVertexBuffer(1, buffer);
    pass.setIndexBuffer(this.quadIndex!, "uint16");
    pass.drawIndexed(6, segCount, 0, 0, firstSegment);

    if (prim.join === "round") {
      let joinBuffer: GPUBuffer;
      if (prim.resourceKey != null && prim.revision != null) {
        const cached = this.getCachedBuffer(
          this.markerCache,
          prim.resourceKey,
          prim.points.byteLength,
          prim.revision,
        );
        joinBuffer = cached.buffer;
        if (cached.write) this.writeBuffer(joinBuffer, prim.points);
      } else {
        joinBuffer = this.ensureGeomBuffer(
          "marker",
          this.markerIndex++,
          prim.points.byteLength,
        );
        this.writeBuffer(joinBuffer, prim.points);
      }
      const joinGroup = this.writeDrawUniform({
        fill: prim.color,
        stroke: prim.color,
        size: prim.widthPx * dpr,
        strokeWidth: 0,
        opacity: prim.opacity,
        roundness: 1,
        pick: undefined,
      });
      pass.setPipeline(this.pipelineMarker!);
      pass.setBindGroup(1, joinGroup);
      pass.setVertexBuffer(0, this.quadBuffer!);
      pass.setVertexBuffer(1, joinBuffer);
      pass.setIndexBuffer(this.quadIndex!, "uint16");
      pass.drawIndexed(6, drawCount, 0, 0, drawStart);
    }
  }

  private drawMesh(
    pass: GPURenderPassEncoder,
    prim: Extract<Primitive, { kind: "mesh" }>,
    dpr: number,
    picking: boolean,
  ) {
    if (!this.gpu) return;
    if (prim.count <= 0) return;
    if (picking) return;
    let buffer: GPUBuffer;
    if (prim.resourceKey != null && prim.revision != null) {
      const cached = this.getCachedBuffer(
        this.trisCache,
        prim.resourceKey,
        prim.positions.byteLength,
        prim.revision,
      );
      buffer = cached.buffer;
      if (cached.write) this.writeBuffer(buffer, prim.positions);
    } else {
      buffer = this.ensureGeomBuffer(
        "tris",
        this.trisIndex++,
        prim.positions.byteLength,
      );
      this.writeBuffer(buffer, prim.positions);
    }

    const bindGroup = this.writeDrawUniform({
      fill: prim.fill,
      stroke: prim.fill,
      size: 0,
      strokeWidth: 0,
      opacity: prim.opacity,
      roundness: 0,
      pick: undefined,
    });

    pass.setPipeline(this.pipelineTris!);
    pass.setBindGroup(1, bindGroup);
    pass.setVertexBuffer(0, buffer);
    pass.draw(prim.count, 1, 0, 0);
  }

  private ensureGeomBuffer(
    kind: "marker" | "rect" | "stroke" | "tris",
    index: number,
    bytes: number,
  ) {
    if (!this.gpu) throw new Error("GPU not ready");
    const usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    const device = this.gpu.device;
    let buffers: GPUBuffer[];
    let caps: number[];
    if (kind === "marker") {
      buffers = this.markerBuffers;
      caps = this.markerCaps;
    } else if (kind === "rect") {
      buffers = this.rectBuffers;
      caps = this.rectCaps;
    } else if (kind === "stroke") {
      buffers = this.strokeBuffers;
      caps = this.strokeCaps;
    } else {
      buffers = this.trisBuffers;
      caps = this.trisCaps;
    }
    let buffer = buffers[index];
    let capacity = caps[index] ?? 0;
    if (!buffer || capacity < bytes) {
      const next = Math.max(bytes, capacity * 2, 1024);
      buffer = device.createBuffer({ size: next, usage });
      buffers[index] = buffer;
      caps[index] = next;
    }
    return buffer;
  }

  private getCachedBuffer(
    cache: BufferCache,
    key: number,
    bytes: number,
    revision: number,
  ): { buffer: GPUBuffer; write: boolean; entry: BufferCacheEntry } {
    if (!this.gpu) throw new Error("GPU not ready");
    return cache.get(this.gpu.device, key, bytes, revision);
  }

  private ensureSegmentScratch(len: number): Float32Array {
    if (this.segmentScratch.length < len) {
      this.segmentScratch = new Float32Array(len * 2);
    }
    return this.segmentScratch;
  }

  private fillSegments(
    points: Float32Array,
    start: number,
    count: number,
    out: Float32Array,
  ): void {
    for (let i = 0; i < count; i++) {
      const s = (start + i) * 2;
      const d = i * 4;
      out[d] = points[s] ?? 0;
      out[d + 1] = points[s + 1] ?? 0;
      out[d + 2] = points[s + 2] ?? 0;
      out[d + 3] = points[s + 3] ?? 0;
    }
  }

  private writeBuffer(buffer: GPUBuffer, data: ArrayBufferView): void {
    if (!this.gpu) return;
    this.gpu.queue.writeBuffer(
      buffer,
      0,
      data.buffer as ArrayBuffer,
      data.byteOffset,
      data.byteLength,
    );
  }

  private writeDrawUniform(args: {
    fill: readonly [number, number, number, number];
    stroke: readonly [number, number, number, number];
    size: number;
    strokeWidth: number;
    opacity: number;
    roundness?: number;
    pick?: { idBase: number; perInstance?: true };
  }): GPUBindGroup {
    if (!this.gpu || !this.drawBindGroupLayout) return this.drawBindGroup!;
    const d = this.drawUniform;
    d[0] = args.fill[0];
    d[1] = args.fill[1];
    d[2] = args.fill[2];
    d[3] = args.fill[3];
    d[4] = args.stroke[0];
    d[5] = args.stroke[1];
    d[6] = args.stroke[2];
    d[7] = args.stroke[3];
    d[8] = args.size;
    d[9] = args.strokeWidth;
    d[10] = args.opacity;
    d[11] = args.pick?.perInstance ? 1 : 0;
    d[12] = args.pick?.idBase ?? 0;
    d[13] = args.roundness ?? 0;
    d[14] = 0;
    d[15] = 0;
    const idx = this.drawIndex++;
    let buffer = this.drawBuffers[idx];
    let bindGroup = this.drawBindGroups[idx];
    if (!buffer || !bindGroup) {
      buffer = this.gpu.device.createBuffer({
        size: this.drawUniform.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      bindGroup = this.gpu.device.createBindGroup({
        layout: this.drawBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      this.drawBuffers[idx] = buffer;
      this.drawBindGroups[idx] = bindGroup;
    }
    this.writeBuffer(buffer, d);
    return bindGroup;
  }
}
