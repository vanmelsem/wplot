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

export class Registry<A extends Keyed> {
  private readonly adapters = new Map<string, A>();

  constructor(private readonly label: string) {}

  register(adapter: A): void {
    this.adapters.set(adapter.kind, adapter);
  }

  get(kind: string): A {
    const adapter = this.adapters.get(kind);
    if (!adapter) throw new Error(`Unknown ${this.label}: ${kind}`);
    return adapter;
  }

  has(kind: string): boolean {
    return this.adapters.has(kind);
  }
}
