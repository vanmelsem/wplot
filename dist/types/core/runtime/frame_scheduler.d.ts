export interface FrameSchedulable {
    flushScheduledFrame(): void;
}
export declare class RuntimeFrameScheduler {
    private queued;
    private raf;
    private flushing;
    enqueue(runtime: FrameSchedulable): void;
    remove(runtime: FrameSchedulable): void;
    private readonly flush;
}
export declare const runtimeFrameScheduler: RuntimeFrameScheduler;
