# Domain

Owns semantic plot state only.

Allowed contents:

- series definitions
- object definitions
- view state
- config state
- mutation commands

Forbidden contents:

- render primitives
- text layout
- scene caches
- picking implementations
- DOM/runtime types

If a type needs `Primitive`, `TextEntry`, canvas, or pointer event knowledge, it
does not belong here.
