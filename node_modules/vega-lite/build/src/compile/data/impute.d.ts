import { FormulaTransform as VgFormulaTransform } from 'vega';
import { ImputeTransform } from '../../transform';
import { ImputeTransform as VgImputeTransform } from 'vega';
import { UnitModel } from '../unit';
import { DataFlowNode } from './dataflow';
import { WindowTransform as VgWindowTransform } from 'vega';
export declare class ImputeNode extends DataFlowNode {
    private readonly transform;
    clone(): ImputeNode;
    constructor(parent: DataFlowNode, transform: ImputeTransform);
    dependentFields(): Set<string>;
    producedFields(): Set<string>;
    private processSequence;
    static makeFromTransform(parent: DataFlowNode, imputeTransform: ImputeTransform): ImputeNode;
    static makeFromEncoding(parent: DataFlowNode, model: UnitModel): ImputeNode;
    hash(): string;
    assemble(): (VgFormulaTransform | VgImputeTransform | VgWindowTransform)[];
}
//# sourceMappingURL=impute.d.ts.map