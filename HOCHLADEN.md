# Pforte hochladen: Schritt für Schritt

Für Sami. Rund 20 Minuten. Reihenfolge einhalten: erst muss die Demo laufen, dann kommt sie ins Profil,
sonst zeigt der Link im Profil ins Leere.

Alles, was du brauchst, ist schon da: GitHub-Konto `bks-technologies`, Vercel-Konto, IONOS-Zugang.
Der Code ist fertig und lokal committet. Es gibt **keine** Variablen oder Passwörter einzutragen.

---

## Schritt 1: Leeres Repo auf GitHub anlegen (2 Min.)

1. https://github.com/new öffnen (angemeldet als `bks-technologies`).
2. **Repository name:** `pforte`
3. **Public oder Private:** deine Entscheidung.
   - *Public:* Besucher deines Profils können sich den Code ansehen. Für ein Portfolio ein Plus.
   - *Private:* Nur die Demo ist sichtbar, der Code nicht. So sind bisher `Website` und `Stunden` eingestellt.
4. **Nichts ankreuzen** (kein README, kein .gitignore, keine Lizenz), sonst klappt Schritt 2 nicht.
5. „Create repository“ klicken.

## Schritt 2: Code hochladen (1 Min.)

Im Terminal (oder in Claude Code mit `!` davor) diese drei Zeilen nacheinander:

```bash
cd ~/BKS/gateway
git remote add origin git@github.com:bks-technologies/pforte.git
git push -u origin main
```

Fertig, wenn am Ende `branch 'main' set up to track 'origin/main'` steht. Auf GitHub die Seite neu laden:
Die Dateien sind jetzt da.

## Schritt 3: Auf Vercel veröffentlichen (3 Min.)

1. https://vercel.com/new öffnen.
2. Bei „Import Git Repository“ steht `pforte`. **Import** klicken.
   (Fehlt es: „Adjust GitHub App Permissions“ und dem Repo `pforte` Zugriff geben.)
3. Alles so lassen, wie Vercel es vorschlägt (Framework „Next.js“ erkennt es selbst). **Keine** Environment Variables.
4. **Deploy** klicken, gut eine Minute warten.
5. Vercel zeigt eine Adresse wie `pforte-xyz.vercel.app`. Öffnen und kurz prüfen: Diagramm läuft, „Lastspitze
   simulieren“ und Not-Aus reagieren.

Die Region Frankfurt ist schon in der Datei `vercel.json` eingestellt.

## Schritt 4: Eigene Adresse pforte.bkstechnologies.de (5 Min. plus Wartezeit)

**In Vercel:**
1. Im Projekt `pforte` → **Settings** → **Domains**.
2. `pforte.bkstechnologies.de` eintragen → **Add**.
3. Vercel zeigt „Invalid Configuration“ und einen **CNAME-Wert** (etwa `xxxx.vercel-dns-017.com`). Diesen Wert kopieren.

**In IONOS:**
1. Menü **Domains & SSL** → `bkstechnologies.de` → **DNS**.
2. **Eintrag hinzufügen** → Typ **CNAME**.
3. **Hostname:** `pforte` · **Zeigt auf:** den kopierten Wert aus Vercel · TTL so lassen → **Speichern**.
4. **Die MX-Einträge und alles andere nicht anfassen**, sonst geht die Mail kaputt.

Zurück in Vercel: Nach ein paar Minuten (selten bis zu einer Stunde) wird der Eintrag grün („Valid Configuration“).
Dann https://pforte.bkstechnologies.de öffnen. Ein Schloss-Symbol im Browser heißt: Zertifikat ist da.

**Kurz prüfen:** Startseite, unten „Impressum“ und „Datenschutz“.

## Schritt 5: Ins GitHub-Profil aufnehmen (5 Min.)

Erst, wenn Schritt 4 grün ist.

1. https://github.com/bks-technologies/bks-technologies öffnen.
2. **Bilder hochladen:** Auf der Repo-Seite den Ordner **`assets`** anklicken. Dann „Add file“ → „Upload files“.
   Im Finder `~/BKS/gateway/docs/portfolio/` öffnen und den **ganzen Ordner `pforte`** (nicht die einzelnen Bilder)
   ins Upload-Fenster ziehen. GitHub legt damit `assets/pforte/` mit den drei Bildern an. Unten „Commit changes“.
3. **Text einfügen:** Datei `README.md` öffnen → Stift-Symbol (Bearbeiten).
4. Ganz nach unten scrollen. Direkt **über** der Trennlinie `---`, die vor „Sie möchten so etwas …“ steht, eine
   Leerzeile machen und den Text aus `~/BKS/gateway/docs/portfolio-abschnitt.md` einfügen, und zwar **ab der
   Zeile `### Pforte`** (den grauen Kommentar oben nicht).
5. Reiter „Preview“: Die drei Bilder müssen nebeneinander erscheinen. Fehlt ein Bild, stimmt der Ordner nicht.
6. „Commit changes“.
7. https://github.com/bks-technologies öffnen: Pforte steht jetzt im Profil.

**Danach einmal** (damit spätere Änderungen von Claude am Profil nicht mit deinen kollidieren):

```bash
cd ~/BKS/github-portfolio && git pull
```

---

## Vor dem Livegang lesen

- **Datenschutzerklärung ist ein Entwurf** (`app/datenschutz/page.tsx`, gelb markiert auf der Seite), genau wie
  bei Puls. Sie passt inhaltlich (keine Cookies, nichts wird gesendet), ist aber nicht rechtlich geprüft.
- Impressum kommt aus denselben Daten wie die Website (`lib/legal.ts`).
- Alle Firmen-, Artikel- und Systemnamen in der Demo sind erfunden und als Beispieldaten gekennzeichnet.

## Wenn etwas hakt

| Problem | Lösung |
|---|---|
| `git push` meldet `Permission denied (publickey)` | SSH-Schlüssel fehlt in GitHub. Claude fragen, nichts herumprobieren. |
| `git push` meldet `remote origin already exists` | `git remote set-url origin git@github.com:bks-technologies/pforte.git`, dann push wiederholen. |
| `git push` meldet `rejected … fetch first` | Beim Anlegen wurde doch ein README angekreuzt. Repo auf GitHub löschen und Schritt 1 ohne Häkchen wiederholen. |
| Vercel-Build schlägt fehl | Log kopieren und Claude geben. Lokal ist der Build geprüft. |
| Domain bleibt rot | Hostname in IONOS muss genau `pforte` heißen (nicht `pforte.bkstechnologies.de`). |

## Später etwas ändern

Jede Änderung, die nach `main` gepusht wird, geht automatisch live (Vercel baut neu).
