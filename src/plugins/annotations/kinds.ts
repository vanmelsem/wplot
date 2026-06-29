// Kind strings for the editable annotation objects. These live with the plugin,
// not in core — core ships zero default object kinds and learns these only when
// the `annotations()` plugin registers them via `plot.registerObject`.
export const AnnotationObjectKinds = {
  guideH: "object/guide/hline",
  guideV: "object/guide/vline",
  rect: "object/annotation/rect",
  xBand: "object/annotation/x-band",
  yBand: "object/annotation/y-band",
  segment: "object/annotation/segment",
  tag: "object/annotation/tag",
} as const;

export type AnnotationObjectKind =
  (typeof AnnotationObjectKinds)[keyof typeof AnnotationObjectKinds];
