/**
 * Kleiner XML-Leser für die Vorschau. Kein vollständiger Parser: keine DTDs, keine Namespaces
 * (Präfixe wie `soap:` werden entfernt), aber Attribute, Kommentare, CDATA und die fünf
 * Standard-Entitäten. Ergebnis ist ein schlichtes Objekt:
 *
 *   <A x="1"><B>t</B><B>u</B></A>   →   { A: { "@x": "1", B: ["t", "u"] } }
 *
 * Elemente nur mit Text werden zu Strings, wiederholte Elemente zu Arrays.
 */

export type XmlValue = string | XmlObject | XmlValue[];
export interface XmlObject {
  [key: string]: XmlValue;
}

export class XmlError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(message);
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const local = (name: string) => name.slice(name.indexOf(":") + 1);

export function parseXml(src: string): XmlObject {
  let i = 0;

  const skipMisc = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src.startsWith("<?", i)) {
        const end = src.indexOf("?>", i);
        if (end < 0) throw new XmlError("Verarbeitungsanweisung nicht geschlossen.", i);
        i = end + 2;
      } else if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i);
        if (end < 0) throw new XmlError("Kommentar nicht geschlossen.", i);
        i = end + 3;
      } else if (src.startsWith("<!DOCTYPE", i)) {
        const end = src.indexOf(">", i);
        i = end < 0 ? src.length : end + 1;
      } else return;
    }
  };

  const readElement = (): [string, XmlValue] => {
    if (src[i] !== "<") throw new XmlError("Element erwartet.", i);
    i++;
    const nameMatch = /^[A-Za-z_][\w.\-:]*/.exec(src.slice(i));
    if (!nameMatch) throw new XmlError("Elementname fehlt.", i);
    const rawName = nameMatch[0];
    i += rawName.length;

    const obj: XmlObject = {};
    let hasStructure = false;

    // Attribute
    for (;;) {
      while (/\s/.test(src[i] ?? "")) i++;
      if (src.startsWith("/>", i)) {
        i += 2;
        return [local(rawName), hasStructure ? obj : ""];
      }
      if (src[i] === ">") {
        i++;
        break;
      }
      const attr = /^([A-Za-z_][\w.\-:]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(i));
      if (!attr) throw new XmlError(`Ungültiges Attribut in <${rawName}>.`, i);
      i += attr[0].length;
      if (attr[1].startsWith("xmlns")) continue;
      obj["@" + local(attr[1])] = decode(attr[3] ?? attr[4] ?? "");
      hasStructure = true;
    }

    // Inhalt
    let text = "";
    for (;;) {
      if (i >= src.length) throw new XmlError(`<${rawName}> wird nicht geschlossen.`, i);
      if (src.startsWith("</", i)) {
        const end = src.indexOf(">", i);
        const closing = src.slice(i + 2, end).trim();
        if (closing !== rawName) throw new XmlError(`</${closing}> passt nicht zu <${rawName}>.`, i);
        i = end + 1;
        break;
      }
      if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i);
        if (end < 0) throw new XmlError("Kommentar nicht geschlossen.", i);
        i = end + 3;
        continue;
      }
      if (src.startsWith("<![CDATA[", i)) {
        const end = src.indexOf("]]>", i);
        if (end < 0) throw new XmlError("CDATA nicht geschlossen.", i);
        text += src.slice(i + 9, end);
        i = end + 3;
        continue;
      }
      if (src[i] === "<") {
        const [name, value] = readElement();
        const prev = obj[name];
        obj[name] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
        hasStructure = true;
        continue;
      }
      const next = src.indexOf("<", i);
      const chunk = src.slice(i, next < 0 ? src.length : next);
      text += decode(chunk);
      i = next < 0 ? src.length : next;
    }

    const trimmed = text.trim();
    if (!hasStructure) return [local(rawName), trimmed];
    if (trimmed) obj["#text"] = trimmed;
    return [local(rawName), obj];
  };

  skipMisc();
  if (i >= src.length) throw new XmlError("Kein Wurzelelement gefunden.", i);
  const [name, value] = readElement();
  skipMisc();
  if (i < src.length) throw new XmlError("Text nach dem Wurzelelement.", i);
  return { [name]: value };
}
