import { Scene, TextAlign } from "../../../core/scene";
import { PLOT_TEXT_FONT } from "./style";

export class TextRenderer {
  constructor(private canvas: HTMLCanvasElement) {}

  render(scene: Scene): void {
    const { dpr, canvas: canvasSize } = scene.viewport;
    const w = Math.max(1, Math.round(canvasSize.width * dpr));
    const h = Math.max(1, Math.round(canvasSize.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const plot = scene.viewport.plot;
    if (plot.size.width > 0 && plot.size.height > 0) {
      ctx.strokeStyle = `rgba(${Math.round(scene.borderColor[0] * 255)},${Math.round(scene.borderColor[1] * 255)},${Math.round(scene.borderColor[2] * 255)},${scene.borderColor[3]})`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        plot.origin.x + 0.5,
        plot.origin.y + 0.5,
        plot.size.width - 1,
        plot.size.height - 1,
      );
    }

    if (scene.crosshair && plot.size.width > 0 && plot.size.height > 0) {
      const s = { x: scene.crosshair.sx, y: scene.crosshair.sy };
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.origin.x, plot.origin.y, plot.size.width, plot.size.height);
      ctx.clip();
      ctx.strokeStyle = `rgba(${Math.round(scene.crosshair.color[0] * 255)},${Math.round(scene.crosshair.color[1] * 255)},${Math.round(scene.crosshair.color[2] * 255)},${scene.crosshair.color[3]})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x, plot.origin.y);
      ctx.lineTo(s.x, plot.origin.y + plot.size.height);
      ctx.moveTo(plot.origin.x, s.y);
      ctx.lineTo(plot.origin.x + plot.size.width, s.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#cfd7e3";
    ctx.font = PLOT_TEXT_FONT;

    for (const t of scene.text) {
      switch (t.align) {
        case TextAlign.Center:
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          break;
        case TextAlign.TopLeft:
        default:
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          break;
      }
      ctx.fillStyle = `rgba(${Math.round(t.color[0] * 255)},${Math.round(t.color[1] * 255)},${Math.round(t.color[2] * 255)},${t.color[3]})`;
      ctx.fillText(t.text, t.x, t.y);
    }

    if (scene.stats) {
      const stats = scene.stats;
      const gpuText =
        stats.gpuMs < 0 ? "gpu n/a" : `gpu ${stats.gpuMs.toFixed(2)} ms`;
      const text = `frame ${stats.frameMs.toFixed(2)} ms  cpu ${stats.cpuMs.toFixed(2)} ms  ${gpuText}  ${stats.fps.toFixed(0)} fps`;
      const pad = 6;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(210, 220, 235, 0.85)";
      ctx.fillText(
        text,
        plot.origin.x + plot.size.width - pad,
        plot.origin.y + pad,
      );
    }
  }
}
