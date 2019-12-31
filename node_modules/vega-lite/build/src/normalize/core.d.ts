import { ExtendedLayerSpec, FacetedUnitSpec, GenericSpec, UnitSpec } from '../spec';
import { GenericFacetSpec, NormalizedFacetSpec } from '../spec/facet';
import { GenericLayerSpec, NormalizedLayerSpec } from '../spec/layer';
import { SpecMapper } from '../spec/map';
import { GenericRepeatSpec } from '../spec/repeat';
import { NormalizedUnitSpec } from '../spec/unit';
import { NormalizerParams } from './base';
export declare class CoreNormalizer extends SpecMapper<NormalizerParams, FacetedUnitSpec, ExtendedLayerSpec> {
    private nonFacetUnitNormalizers;
    map(spec: GenericSpec<FacetedUnitSpec, ExtendedLayerSpec>, params: NormalizerParams): NormalizedUnitSpec | NormalizedFacetSpec | GenericLayerSpec<NormalizedUnitSpec> | GenericRepeatSpec<NormalizedUnitSpec, GenericLayerSpec<NormalizedUnitSpec>> | import("../spec/concat").GenericConcatSpec<NormalizedUnitSpec, GenericLayerSpec<NormalizedUnitSpec>> | import("../spec").GenericVConcatSpec<NormalizedUnitSpec, GenericLayerSpec<NormalizedUnitSpec>> | import("../spec").GenericHConcatSpec<NormalizedUnitSpec, GenericLayerSpec<NormalizedUnitSpec>>;
    mapUnit(spec: UnitSpec, params: NormalizerParams): NormalizedUnitSpec | NormalizedLayerSpec;
    protected mapRepeat(spec: GenericRepeatSpec<UnitSpec, ExtendedLayerSpec>, params: NormalizerParams): GenericRepeatSpec<NormalizedUnitSpec, NormalizedLayerSpec>;
    protected mapFacet(spec: GenericFacetSpec<UnitSpec, ExtendedLayerSpec>, params: NormalizerParams): GenericFacetSpec<NormalizedUnitSpec, NormalizedLayerSpec>;
    private mapUnitWithParentEncodingOrProjection;
    private mapFacetedUnit;
    private getFacetMappingAndLayout;
    mapLayer(spec: ExtendedLayerSpec, { parentEncoding, parentProjection, ...otherParams }: NormalizerParams): GenericLayerSpec<NormalizedUnitSpec>;
}
//# sourceMappingURL=core.d.ts.map