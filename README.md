# Pforte · API Gateway & Rate-Limiting Control Panel

Eine Demo von [BKS Technologies](https://bkstechnologies.de). Control Panel für ein API-Gateway, das eine
Mobile App vor einem alten Warenwirtschaftssystem abschirmt. **Der Verkehr ist simuliert, alle Daten sind
Beispieldaten.** Es gibt kein Backend; Regeln und Breaker-Einstellungen liegen im localStorage.

## Funktionen

- **Verkehr in Echtzeit:** Recharts-Diagramm, eingehende vs. an das Legacy-System weitergeleitete Anfragen pro
  Sekunde, 1 oder 5 Minuten, Tooltip mit Aufschlüsselung (Cache, 429, 503, Latenz), Kapazitätslinie,
  Breaker-Phasen als Fläche, Linien per Legende ausblendbar, Anhalten. Knopf „Lastspitze simulieren“.
- **Regeln:** Endpunkt (exakt oder Präfix mit `*`), Methode, max. Anfragen pro Sekunde/Minute/Stunde, Cache-TTL.
  Prüfung mit Meldungen am Feld, Dubletten-Erkennung, Vorschau der Wirkung, Bearbeiten, Pausieren, Löschen.
- **Payload Transformer:** SOAP/XML- oder OData/JSON-Antwort (bearbeitbar) → schlanke JSON-Antwort für die App,
  Zuordnung je Feld mit Status, Größenvergleich, bewusst zurückgehaltene Felder (Einkaufspreis, interne Notiz).
- **Circuit Breaker:** Not-Aus ohne Rückfrage, Modus Drosseln (5–90 % der Backend-Kapazität) oder Abfangen
  (nur Cache, sonst 503). Lösen startet eine Erholungsphase (half-open, 20 s von 25 auf 100 %). Warnung bei Überlast.
- Protokoll aller Änderungen und Vorfälle.

## Aufbau

Daten-Logik und Oberfläche sind getrennt:

| Ort | Inhalt |
| --- | --- |
| `lib/types.ts` | Typen |
| `lib/rules.ts` | Prüfung, Zuordnung Pfad → Regel, Cache-Modell |
| `lib/traffic.ts` | Simulation je Sekunde (reine Funktionen, fester Zufallsgenerator), Breaker-Phasen |
| `lib/xml.ts`, `lib/transform.ts`, `lib/samples.ts` | XML-Leser, Zuordnungen, Beispiel-Antworten |
| `lib/store.ts` | Zustand ohne React, Takt, Aktionen, localStorage |
| `lib/use-gateway.ts` | einzige Brücke: `useSyncExternalStore` |
| `components/dashboard/control-panel.tsx` | einziger Ort, der den Store kennt, reicht Props weiter |
| `components/**` | reine Darstellung |

Die Zahlen der Simulation (Kapazität 140 Anfragen/s, Grundlast 150/s, Cache-Trefferquote nach TTL) sind
Annahmen für die Vorführung, keine Messung.

## Entwickeln

```bash
npm install
npm run dev     # Port frei wählen, z. B. -- -p 3250 (3000/3100/3200 nutzen andere Projekte)
npm test        # 28 Tests
npm run lint
npm run build
```

## Veröffentlichen

Schritt-für-Schritt-Anleitung für GitHub, Vercel (fra1, keine Variablen), Domain `pforte.bkstechnologies.de` und das
GitHub-Profil: **[HOCHLADEN.md](./HOCHLADEN.md)**. Screenshots in `docs/screenshots/`, der fertige Profil-Abschnitt in
`docs/portfolio-abschnitt.md`. Die Datenschutzerklärung ist ein Entwurf (`app/datenschutz/page.tsx`).
