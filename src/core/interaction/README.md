# Interaction

Owns input normalization and tool routing.

Allowed contents:

- pointer/wheel/keyboard normalization
- tool dispatch
- interaction-local state
- scene picking integration

Forbidden contents:

- hidden gesture ownership in a second path
- per-kind renderer logic
- semantic series/object storage

If a gesture exists, it must have one owner.
