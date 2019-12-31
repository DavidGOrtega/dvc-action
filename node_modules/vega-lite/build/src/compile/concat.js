import * as log from '../log';
import { isHConcatSpec, isVConcatSpec } from '../spec';
import { BaseConcatModel } from './baseconcat';
import { buildModel } from './buildmodel';
import { parseConcatLayoutSize } from './layoutsize/parse';
export class ConcatModel extends BaseConcatModel {
    constructor(spec, parent, parentGivenName, repeater, config) {
        var _a, _b, _c, _d;
        super(spec, 'concat', parent, parentGivenName, config, repeater, spec.resolve);
        if (((_b = (_a = spec.resolve) === null || _a === void 0 ? void 0 : _a.axis) === null || _b === void 0 ? void 0 : _b.x) === 'shared' || ((_d = (_c = spec.resolve) === null || _c === void 0 ? void 0 : _c.axis) === null || _d === void 0 ? void 0 : _d.y) === 'shared') {
            log.warn(log.message.CONCAT_CANNOT_SHARE_AXIS);
        }
        this.concatType = isVConcatSpec(spec) ? 'vconcat' : isHConcatSpec(spec) ? 'hconcat' : 'concat';
        this.children = this.getChildren(spec).map((child, i) => {
            return buildModel(child, this, this.getName('concat_' + i), undefined, repeater, config);
        });
    }
    getChildren(spec) {
        if (isVConcatSpec(spec)) {
            return spec.vconcat;
        }
        else if (isHConcatSpec(spec)) {
            return spec.hconcat;
        }
        return spec.concat;
    }
    parseLayoutSize() {
        parseConcatLayoutSize(this);
    }
    parseAxisGroup() {
        return null;
    }
    assembleDefaultLayout() {
        return Object.assign(Object.assign({}, (this.concatType === 'vconcat' ? { columns: 1 } : {})), { bounds: 'full', 
            // Use align each so it can work with multiple plots with different size
            align: 'each' });
    }
}
//# sourceMappingURL=concat.js.map