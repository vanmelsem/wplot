import { InteractionController } from "../core/interaction/controller";
export type LinkAxes = {
    x?: boolean;
    y?: boolean;
};
export type LinkCursor = {
    x?: boolean;
    y?: boolean;
};
export type LinkOptions = {
    id?: string;
    axes?: LinkAxes;
    cursor?: LinkCursor;
};
type LinkableInteraction = Pick<InteractionController, "events" | "peekView" | "setView" | "syncLinkedCursor">;
export declare class LinkGroup {
    private entries;
    private suppressDepth;
    register(controller: LinkableInteraction, options?: LinkOptions): () => void;
    private unregister;
    private onView;
    private onCursor;
}
export declare function createLinkGroup(): LinkGroup;
export {};
