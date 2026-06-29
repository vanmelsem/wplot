# Storage

Owns typed-array storage and window query.

Allowed contents:

- append/replace-safe storage
- window/range query
- typed numeric helpers
- offset-normalized storage semantics

Forbidden contents:

- render primitive creation
- scene frame assembly
- pointer/hover logic
- public API concerns

Storage should be reusable by any series scene adapter without importing
interaction or renderer code.
