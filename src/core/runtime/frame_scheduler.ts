export interface FrameSchedulable {
  flushScheduledFrame(): void;
}

// Linked plots can dirty each other during a frame flush. Allow a few same-frame
// passes so followers render in the same RAF without permitting runaway loops.
const MAX_SAME_FRAME_FLUSH_PASSES = 4;

export class RuntimeFrameScheduler {
  private queued = new Set<FrameSchedulable>();
  private raf = 0;
  private flushing = false;

  enqueue(runtime: FrameSchedulable): void {
    this.queued.add(runtime);
    if (this.flushing) return;
    if (this.raf !== 0) return;
    this.raf = requestAnimationFrame(this.flush);
  }

  remove(runtime: FrameSchedulable): void {
    this.queued.delete(runtime);
  }

  private readonly flush = () => {
    this.raf = 0;
    this.flushing = true;
    let pass = 0;
    while (this.queued.size > 0 && pass < MAX_SAME_FRAME_FLUSH_PASSES) {
      const batch = Array.from(this.queued);
      this.queued.clear();
      for (let i = 0; i < batch.length; i += 1) {
        batch[i]!.flushScheduledFrame();
      }
      pass += 1;
    }
    this.flushing = false;
    if (this.queued.size > 0) {
      this.raf = requestAnimationFrame(this.flush);
    }
  };
}

export const runtimeFrameScheduler = new RuntimeFrameScheduler();
