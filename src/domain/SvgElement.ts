/** An output DTO, not an editable model. XML escaping belongs to the codec. */
export interface SvgElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly SvgElement[];
  readonly text?: string;
}
