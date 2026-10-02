import type { Mapping, SourceFormat } from "./transform";

/**
 * Beispiel-Antworten eines fiktiven Warenwirtschaftssystems. Erfundene Beispieldaten,
 * kein Kundensystem. Bewusst „gewachsen“: Kürzel, Füllfelder, interne Werte.
 */

export const LEGACY_XML = `<?xml version="1.0" encoding="ISO-8859-1"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <TransactionId>TX-0000981273-A</TransactionId>
    <SessionToken>c2Vzc2lvbi1kZW1vLW9ubHk=</SessionToken>
    <ServerNode>WWS-PROD-02</ServerNode>
  </soap:Header>
  <soap:Body>
    <GetArticleResponse>
      <ReturnCode>0000</ReturnCode>
      <ReturnText>OK</ReturnText>
      <ArticleRecord RecordStatus="A" LastModUser="BATCH01" Mandant="001">
        <ART_NR>0004711</ART_NR>
        <ART_BEZ_1>Akkuschrauber 18 V</ART_BEZ_1>
        <ART_BEZ_2>inkl. 2 Akkus und Koffer</ART_BEZ_2>
        <ART_BEZ_3></ART_BEZ_3>
        <MATCHCODE>AKKUSCHR18V</MATCHCODE>
        <WG_NR>0412</WG_NR>
        <WG_BEZ>ELEKTROWERKZEUG</WG_BEZ>
        <VK_PREIS_BRUTTO>149,90</VK_PREIS_BRUTTO>
        <VK_PREIS_NETTO>125,97</VK_PREIS_NETTO>
        <EK_PREIS>71,40</EK_PREIS>
        <MWST_KZ>1</MWST_KZ>
        <WAEHRUNG_ISO>EUR</WAEHRUNG_ISO>
        <AKTIV_KZ>J</AKTIV_KZ>
        <LOESCH_KZ>N</LOESCH_KZ>
        <LAGER_BESTAND>
          <LAGER LagerNr="01" LagerBez="Hauptlager"><MENGE>12</MENGE><RESERVIERT>2</RESERVIERT></LAGER>
          <LAGER LagerNr="02" LagerBez="Filiale Nord"><MENGE>3</MENGE><RESERVIERT>0</RESERVIERT></LAGER>
          <LAGER LagerNr="99" LagerBez="Retouren"><MENGE>0</MENGE><RESERVIERT>0</RESERVIERT></LAGER>
        </LAGER_BESTAND>
        <BILDER>
          <BILD><URL>https://cdn.example.com/art/0004711_1.jpg</URL><SORT>1</SORT></BILD>
          <BILD><URL>https://cdn.example.com/art/0004711_2.jpg</URL><SORT>2</SORT></BILD>
        </BILDER>
        <INTERNE_NOTIZ>Lieferant wechselt Q4, Preis neu verhandeln</INTERNE_NOTIZ>
        <KOSTENSTELLE>4100</KOSTENSTELLE>
        <ANLAGE_DATUM>20190311</ANLAGE_DATUM>
        <AENDERUNG_DATUM>20260914</AENDERUNG_DATUM>
        <FILLER_01></FILLER_01>
        <FILLER_02></FILLER_02>
        <FILLER_03>                    </FILLER_03>
      </ArticleRecord>
    </GetArticleResponse>
  </soap:Body>
</soap:Envelope>`;

export const LEGACY_JSON = `{
  "d": {
    "__count": "1",
    "results": [
      {
        "__metadata": {
          "id": "https://wws.example.local/odata/ArticleSet('0004711')",
          "uri": "https://wws.example.local/odata/ArticleSet('0004711')",
          "type": "WWS.Article",
          "etag": "W/\\"datetime'2026-09-14T06%3A12%3A40'\\""
        },
        "ArticleNo": "0004711",
        "Description1": "Akkuschrauber 18 V",
        "Description2": "inkl. 2 Akkus und Koffer",
        "Description3": "",
        "Matchcode": "AKKUSCHR18V",
        "PriceGross": "149.90",
        "PriceNet": "125.97",
        "PurchasePrice": "71.40",
        "Currency": "EUR",
        "ActiveFlag": "X",
        "DeletionFlag": "",
        "Stock": {
          "results": [
            { "__metadata": { "type": "WWS.Stock" }, "Plant": "01", "Quantity": "12.000", "Unit": "ST" },
            { "__metadata": { "type": "WWS.Stock" }, "Plant": "02", "Quantity": "3.000", "Unit": "ST" }
          ]
        },
        "Images": {
          "results": [
            { "Url": "https://cdn.example.com/art/0004711_1.jpg", "Sort": 1 },
            { "Url": "https://cdn.example.com/art/0004711_2.jpg", "Sort": 2 }
          ]
        },
        "InternalNote": "Lieferant wechselt Q4, Preis neu verhandeln",
        "CostCenter": "4100",
        "CreatedOn": "/Date(1552262400000)/",
        "ChangedOn": "/Date(1789344000000)/",
        "ChangedBy": "BATCH01"
      }
    ]
  }
}`;

const XML_BASE = "Envelope.Body.GetArticleResponse.ArticleRecord";
const JSON_BASE = "d.results[0]";

export const MAPPINGS: Record<SourceFormat, Mapping[]> = {
  xml: [
    { target: "id", source: `${XML_BASE}.ART_NR`, op: "id", note: "führende Nullen weg" },
    { target: "name", source: `${XML_BASE}.ART_BEZ_1`, op: "text", note: "" },
    { target: "subtitle", source: `${XML_BASE}.ART_BEZ_2`, op: "text", note: "" },
    { target: "price.amount", source: `${XML_BASE}.VK_PREIS_BRUTTO`, op: "cents", note: "Komma-Betrag in Cent" },
    { target: "price.currency", source: `${XML_BASE}.WAEHRUNG_ISO`, op: "text", note: "" },
    { target: "stock", source: `${XML_BASE}.LAGER_BESTAND.LAGER[].MENGE`, op: "sum", note: "alle Lager addiert" },
    { target: "available", source: `${XML_BASE}.AKTIV_KZ`, op: "flag", note: "J/N" },
    { target: "images", source: `${XML_BASE}.BILDER.BILD[].URL`, op: "list", note: "" },
    { target: "updatedAt", source: `${XML_BASE}.AENDERUNG_DATUM`, op: "date", note: "JJJJMMTT" },
  ],
  json: [
    { target: "id", source: `${JSON_BASE}.ArticleNo`, op: "id", note: "führende Nullen weg" },
    { target: "name", source: `${JSON_BASE}.Description1`, op: "text", note: "" },
    { target: "subtitle", source: `${JSON_BASE}.Description2`, op: "text", note: "" },
    { target: "price.amount", source: `${JSON_BASE}.PriceGross`, op: "cents", note: "Text-Betrag in Cent" },
    { target: "price.currency", source: `${JSON_BASE}.Currency`, op: "text", note: "" },
    { target: "stock", source: `${JSON_BASE}.Stock.results[].Quantity`, op: "sum", note: "alle Werke addiert" },
    { target: "available", source: `${JSON_BASE}.ActiveFlag`, op: "flag", note: "X = aktiv" },
    { target: "images", source: `${JSON_BASE}.Images.results[].Url`, op: "list", note: "" },
    { target: "updatedAt", source: `${JSON_BASE}.ChangedOn`, op: "date", note: "/Date(…)/" },
  ],
};

export const SAMPLES: Record<SourceFormat, string> = { xml: LEGACY_XML, json: LEGACY_JSON };

/** Felder, die das Gateway bewusst zurückhält. Werden in der Vorschau als „gefiltert“ markiert. */
export const SENSITIVE: Record<SourceFormat, string[]> = {
  xml: ["EK_PREIS", "INTERNE_NOTIZ", "KOSTENSTELLE", "SessionToken"],
  json: ["PurchasePrice", "InternalNote", "CostCenter"],
};
