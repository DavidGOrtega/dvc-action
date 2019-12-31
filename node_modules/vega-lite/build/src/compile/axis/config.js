export function getAxisConfig(property, config, channel, orient, scaleType) {
    var _a;
    // configTypes to loop, starting from higher precedence
    const configTypes = [
        ...(scaleType === 'band' ? ['axisBand'] : []),
        channel === 'x' ? 'axisX' : 'axisY',
        // axisTop, axisBottom, ...
        ...(orient ? ['axis' + orient.substr(0, 1).toUpperCase() + orient.substr(1)] : []),
        'axis'
    ];
    for (const configType of configTypes) {
        if (((_a = config[configType]) === null || _a === void 0 ? void 0 : _a[property]) !== undefined) {
            return config[configType][property];
        }
    }
    return undefined;
}
//# sourceMappingURL=config.js.map