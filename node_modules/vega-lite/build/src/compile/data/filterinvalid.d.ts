import { Dict } from '../../util';
import { FilterTransform as VgFilterTransform } from 'vega';
import { UnitModel } from '../unit';
import { TypedFieldDef } from './../../channeldef';
import { DataFlowNode } from './dataflow';
export declare class FilterInvalidNode extends DataFlowNode {
    readonly filter: Dict<TypedFieldDef<string>>;
    clone(): FilterInvalidNode;
    constructor(parent: DataFlowNode, filter: Dict<TypedFieldDef<string>>);
    static make(parent: DataFlowNode, model: UnitModel): FilterInvalidNode;
    dependentFields(): Set<string>;
    producedFields(): Set<string>;
    hash(): string;
    /**
     * Create the VgTransforms for each of the filtered fields.
     */
    assemble(): VgFilterTransform;
}
//# sourceMappingURL=filterinvalid.d.ts.map