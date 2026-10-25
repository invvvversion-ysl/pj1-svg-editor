import { DOMImplementation, DOMParser, Node, XMLSerializer, onWarningStopParsing } from "@xmldom/xmldom";
import type { Document, Element } from "@xmldom/xmldom";
import type { LoadedDocument } from "../application/ports/LoadedDocument.js";
import { DomainError } from "../domain/DomainError.js";
import { NumericValue } from "../domain/NumericValue.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { SvgElement } from "../domain/SvgElement.js";
import { ViewBox } from "../domain/ViewBox.js";
import { SvgIdAllocator } from "./SvgIdAllocator.js";

export class SvgCodec {
  private readonly svgNamespace = "http://www.w3.org/2000/svg";
  private readonly xmlnsNamespace = "http://www.w3.org/2000/xmlns/";

  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): LoadedDocument {
    this.assertCharacters(source);
    let parsed: Document;
    try {
      parsed = new DOMParser({
        onError: onWarningStopParsing,
        // SVG output is XML 1.0; keep U+2028/U+2029 intact rather than XML 1.1 normalization.
        normalizeLineEndings: input => input.replace(/\r\n?/gu, "\n"),
      }).parseFromString(source.replace(/^\uFEFF/u, ""), "application/xml");
    } catch {
      throw new DomainError("invalid SVG XML");
    }
    for (const node of Array.from(parsed.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.COMMENT_NODE) continue;
      if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE && node.nodeName === "xml") {
        if (!/\bversion\s*=\s*(['"])1\.0\1/u.test(node.nodeValue ?? "")) throw new DomainError("unsupported XML version: expected 1.0");
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE && /^[\t\r\n ]*$/u.test(node.nodeValue ?? "")) continue;
      throw new DomainError("unsupported SVG XML declaration or document node");
    }
    const root = parsed.documentElement;
    if (root === null || root.localName !== "svg") throw new DomainError("invalid SVG root: expected <svg>");
    const element = this.readElement(root);
    for (const name of Object.keys(element.attributes)) {
      if (!["width", "height", "viewBox"].includes(name)) throw new DomainError(`unsupported SVG root attribute: ${name}`);
    }
    if (!/^[\t\r\n ]*$/u.test(element.text ?? "")) throw new DomainError("unsupported text content in <svg>");
    const box = element.attributes.viewBox === undefined ? undefined : ViewBox.parse(element.attributes.viewBox);
    const width = this.dimension(element.attributes.width, "canvas width", box?.width ?? 800);
    const height = this.dimension(element.attributes.height, "canvas height", box?.height ?? 600);
    const ids = new SvgIdAllocator(element.children);
    const roots = element.children.map(child => this.factory.fromElement(ids.assign(child)));
    return { document: new SvgDocument(width, height, roots, box), warnings: ids.warnings };
  }

  encode(document: SvgDocument): string {
    const element = document.toSvgElement();
    const xml = new DOMImplementation().createDocument(this.svgNamespace, "svg", null);
    this.fillElement(xml.documentElement!, element, xml, 0);
    const content = new XMLSerializer().serializeToString(xml, { requireWellFormed: true });
    return `<?xml version="1.0" encoding="UTF-8"?>\n${content.replace(/\r/gu, "&#13;")}\n`;
  }

  private readElement(node: Element): SvgElement {
    if (node.namespaceURI !== null && node.namespaceURI !== "" && node.namespaceURI !== this.svgNamespace) {
      throw new DomainError(`unsupported SVG namespace: ${node.namespaceURI}`);
    }
    const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const attr of Array.from(node.attributes)) {
      if (attr.namespaceURI === this.xmlnsNamespace) continue;
      if (attr.namespaceURI !== null && attr.namespaceURI !== "") throw new DomainError(`unsupported SVG attribute namespace: ${attr.name}`);
      this.assertCharacters(attr.value);
      attributes[attr.name] = attr.value;
    }
    const children: SvgElement[] = [];
    let text = "";
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) children.push(this.readElement(child as Element));
      else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) text += child.nodeValue ?? "";
      else if (child.nodeType !== Node.COMMENT_NODE) throw new DomainError(`unsupported SVG XML node in <${node.localName}>`);
    }
    this.assertCharacters(text);
    return { name: node.localName!, attributes, children, text };
  }

  private fillElement(node: Element, element: SvgElement, owner: Document, depth: number): void {
    for (const [name, value] of Object.entries(element.attributes)) {
      this.assertCharacters(value);
      if (name === "xmlns") node.setAttributeNS(this.xmlnsNamespace, name, value);
      else node.setAttribute(name, value);
    }
    if (element.text !== undefined) {
      this.assertCharacters(element.text);
      node.appendChild(owner.createTextNode(element.text));
    }
    for (const child of element.children) {
      node.appendChild(owner.createTextNode(`\n${"  ".repeat(depth + 1)}`));
      const childNode = owner.createElementNS(this.svgNamespace, child.name);
      this.fillElement(childNode, child, owner, depth + 1);
      node.appendChild(childNode);
    }
    if (element.children.length > 0) node.appendChild(owner.createTextNode(`\n${"  ".repeat(depth)}`));
  }

  private dimension(value: string | undefined, name: string, fallback: number): number {
    return value === undefined ? fallback : NumericValue.positive(value.trim().replace(/px$/u, ""), name);
  }

  private assertCharacters(value: string): void {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new DomainError("invalid XML character in SVG content");
    }
  }
}
