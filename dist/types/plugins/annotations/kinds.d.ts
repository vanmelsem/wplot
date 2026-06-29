export declare const AnnotationObjectKinds: {
    readonly guideH: "object/guide/hline";
    readonly guideV: "object/guide/vline";
    readonly rect: "object/annotation/rect";
    readonly xBand: "object/annotation/x-band";
    readonly yBand: "object/annotation/y-band";
    readonly segment: "object/annotation/segment";
    readonly tag: "object/annotation/tag";
};
export type AnnotationObjectKind = (typeof AnnotationObjectKinds)[keyof typeof AnnotationObjectKinds];
