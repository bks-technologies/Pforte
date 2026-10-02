<!--
Abschnitt für github.com/bks-technologies (Repo bks-technologies/bks-technologies, Datei README.md).
Einfügen direkt über der Trennlinie „---“, die vor „Sie möchten so etwas …“ steht.
Die drei Bilder liegen fertig in docs/portfolio/pforte/ und kommen nach assets/pforte/ (Anleitung: HOCHLADEN.md, Schritt 5).
Erst veröffentlichen, wenn https://pforte.bkstechnologies.de erreichbar ist, sonst zeigt der Link ins Leere.
Alles ab der Zeile „### Pforte“ kopieren, diesen Kommentar nicht.
-->

### Pforte: altes System vor der Last einer App schützen

*Eigenentwicklung, Demo*

Eine neue Mobile App soll Daten aus einem alten Warenwirtschaftssystem holen, aber das alte System verkraftet die vielen Anfragen nicht und antwortet in einem schwerfälligen Format. Pforte steht dazwischen: begrenzt die Anfragen, beantwortet Wiederholungen aus dem Zwischenspeicher, wandelt die alten Antworten in schlankes JSON um und hat einen Not-Aus für den Ernstfall.

**[→ Demo ausprobieren](https://pforte.bkstechnologies.de)**: ohne Anmeldung, mit simuliertem Verkehr. Einfach „Lastspitze simulieren“ drücken und eingreifen.

| Live-Verkehr | Not-Aus | Umwandlung |
|:---:|:---:|:---:|
| <img src="./assets/pforte/uebersicht.png" width="270" alt="Übersicht: Kennzahlen und Live-Diagramm, eingehende Anfragen gegen die an das alte System weitergeleiteten"> | <img src="./assets/pforte/not-aus.png" width="270" alt="Not-Aus ausgelöst: die weitergeleiteten Anfragen fallen sofort auf 30 Prozent der Kapazität"> | <img src="./assets/pforte/transformer.png" width="270" alt="Payload Transformer: aufgeblähte XML-Antwort links, schlankes JSON für die App rechts, 87 Prozent kleiner"> |

**Was die Demo kann**

- Live-Diagramm: eingehende Anfragen gegen die, die beim alten System ankommen, mit Kapazitätsgrenze und Aufschlüsselung je Sekunde.
- Regeln je Endpunkt: Höchstzahl pro Sekunde, Minute oder Stunde und Zwischenspeicher-Dauer. Die Wirkung steht schon vor dem Speichern da.
- Umwandlung alter SOAP/XML- oder OData-Antworten in schlankes JSON. Einkaufspreise und interne Notizen verlassen das Gateway nie.
- Not-Aus (Circuit Breaker): drosseln oder komplett abfangen, danach stufenweises Hochfahren, damit das alte System nicht sofort wieder umfällt.

**Technik:** Next.js, React, TypeScript, Tailwind CSS, Recharts. Der Verkehr ist in der Demo simuliert, es wird kein echtes System angesprochen. Gehostet in Frankfurt (Vercel).
