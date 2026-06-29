# API

Owns the public `Plot` boundary.

Allowed contents:

- public method grouping
- event subscription API
- public type exports

Forbidden contents:

- storage internals
- renderer-specific branching
- duplicate naming for the same concept

Core chooses one public term for chart-native overlays: `objects`.
