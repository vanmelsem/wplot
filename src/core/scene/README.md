# Scene

Owns geometry, LOD, picking data, and frame assembly.

Allowed contents:

- series scene adapters
- object scene adapters
- scene caches
- picking indices
- scene frame composition

Forbidden contents:

- authoritative semantic state
- DOM event handling
- public API policy

The central frame builder may compose scene work, but must not own per-kind
knowledge that belongs inside adapters.
