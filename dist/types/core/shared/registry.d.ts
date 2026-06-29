/**
 * A minimal kind-keyed adapter registry.
 *
 * Series and objects each need a model-side and a scene-side registry; all four
 * are the same `Map<kind, adapter>` with a throwing lookup. This generic base is
 * the single implementation; the four named registries are thin subclasses that
 * only fix the adapter type and the not-found label.
 */
export interface Keyed {
    readonly kind: string;
}
export declare class Registry<A extends Keyed> {
    private readonly label;
    private readonly adapters;
    constructor(label: string);
    register(adapter: A): void;
    get(kind: string): A;
    has(kind: string): boolean;
}
