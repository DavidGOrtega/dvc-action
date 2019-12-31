import { __rest } from "tslib";
import { isArray } from 'vega-util';
import { AXIS_PARTS, AXIS_PROPERTY_TYPE, CONDITIONAL_AXIS_PROP_INDEX, isConditionalAxisValue } from '../../axis';
import { POSITION_SCALE_CHANNELS } from '../../channel';
import { defaultTitle } from '../../channeldef';
import { getFirstDefined, keys, replaceAll } from '../../util';
import { isSignalRef } from '../../vega.schema';
import { expression } from '../predicate';
import { isText } from '../../title';
function assembleTitle(title, config) {
    if (!title) {
        return undefined;
    }
    if (!isText(title)) {
        return title.map(fieldDef => defaultTitle(fieldDef, config)).join(', ');
    }
    return title;
}
function setAxisEncode(axis, part, vgProp, vgRef) {
    var _a, _b, _c;
    axis.encode = (_a = axis.encode, (_a !== null && _a !== void 0 ? _a : {}));
    axis.encode[part] = (_b = axis.encode[part], (_b !== null && _b !== void 0 ? _b : {}));
    axis.encode[part].update = (_c = axis.encode[part].update, (_c !== null && _c !== void 0 ? _c : {}));
    // TODO: remove as any after https://github.com/prisma/nexus-prisma/issues/291
    axis.encode[part].update[vgProp] = vgRef;
}
export function assembleAxis(axisCmpt, kind, config, opt = { header: false }) {
    var _a, _b;
    const _c = axisCmpt.combine(), { orient, scale, labelExpr, title, zindex } = _c, axis = __rest(_c, ["orient", "scale", "labelExpr", "title", "zindex"]);
    // Remove properties that are not valid for this kind of axis
    keys(axis).forEach(prop => {
        const propType = AXIS_PROPERTY_TYPE[prop];
        const propValue = axis[prop];
        if (propType && propType !== kind && propType !== 'both') {
            delete axis[prop];
        }
        else if (isConditionalAxisValue(propValue)) {
            const { vgProp, part } = CONDITIONAL_AXIS_PROP_INDEX[prop];
            const { condition, value } = propValue;
            const vgRef = [
                ...(isArray(condition) ? condition : [condition]).map(c => {
                    const { value: v, test } = c;
                    return {
                        test: expression(null, test),
                        value: v
                    };
                }),
                { value }
            ];
            setAxisEncode(axis, part, vgProp, vgRef);
            delete axis[prop];
        }
    });
    if (kind === 'grid') {
        if (!axis.grid) {
            return undefined;
        }
        // Remove unnecessary encode block
        if (axis.encode) {
            // Only need to keep encode block for grid
            const { grid } = axis.encode;
            axis.encode = Object.assign({}, (grid ? { grid } : {}));
            if (keys(axis.encode).length === 0) {
                delete axis.encode;
            }
        }
        return Object.assign(Object.assign({ scale,
            orient }, axis), { domain: false, labels: false, 
            // Always set min/maxExtent to 0 to ensure that `config.axis*.minExtent` and `config.axis*.maxExtent`
            // would not affect gridAxis
            maxExtent: 0, minExtent: 0, ticks: false, zindex: getFirstDefined(zindex, 0) // put grid behind marks by default
         });
    }
    else {
        // kind === 'main'
        if (!opt.header && axisCmpt.mainExtracted) {
            // if mainExtracted has been extracted to a separate facet
            return undefined;
        }
        if (labelExpr !== undefined) {
            let expr = labelExpr;
            if (((_b = (_a = axis.encode) === null || _a === void 0 ? void 0 : _a.labels) === null || _b === void 0 ? void 0 : _b.update) && isSignalRef(axis.encode.labels.update.text)) {
                expr = replaceAll(labelExpr, 'datum.label', axis.encode.labels.update.text.signal);
            }
            setAxisEncode(axis, 'labels', 'text', { signal: expr });
        }
        // Remove unnecessary encode block
        if (axis.encode) {
            for (const part of AXIS_PARTS) {
                if (!axisCmpt.hasAxisPart(part)) {
                    delete axis.encode[part];
                }
            }
            if (keys(axis.encode).length === 0) {
                delete axis.encode;
            }
        }
        const titleString = assembleTitle(title, config);
        return Object.assign(Object.assign(Object.assign({ scale,
            orient, grid: false }, (titleString ? { title: titleString } : {})), axis), { zindex: getFirstDefined(zindex, 0) // put axis line above marks by default
         });
    }
}
/**
 * Add axis signals so grid line works correctly
 * (Fix https://github.com/vega/vega-lite/issues/4226)
 */
export function assembleAxisSignals(model) {
    const { axes } = model.component;
    for (const channel of POSITION_SCALE_CHANNELS) {
        if (axes[channel]) {
            for (const axis of axes[channel]) {
                if (!axis.get('gridScale')) {
                    // If there is x-axis but no y-scale for gridScale, need to set height/weight so x-axis can draw the grid with the right height. Same for y-axis and width.
                    const sizeType = channel === 'x' ? 'height' : 'width';
                    return [
                        {
                            name: sizeType,
                            update: model.getSizeSignalRef(sizeType).signal
                        }
                    ];
                }
            }
        }
    }
    return [];
}
export function assembleAxes(axisComponents, config) {
    const { x = [], y = [] } = axisComponents;
    return [
        ...x.map(a => assembleAxis(a, 'grid', config)),
        ...y.map(a => assembleAxis(a, 'grid', config)),
        ...x.map(a => assembleAxis(a, 'main', config)),
        ...y.map(a => assembleAxis(a, 'main', config))
    ].filter(a => a); // filter undefined
}
//# sourceMappingURL=assemble.js.map