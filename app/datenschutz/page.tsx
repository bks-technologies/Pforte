import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { company as c } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutz" };

/**
 * ENTWURF, von Sami zu prüfen. Aufbau nach Art. 13 DSGVO.
 * Die Demo hat keinen Server-Teil, keine Konten, keine Datenbank. Hosting: Vercel, Region Frankfurt.
 */
export default function Page() {
  return (
    <LegalPage title="Datenschutz">
      <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn-ink">Entwurf, noch nicht rechtlich geprüft.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {c.legalName}, {c.street}, {c.zip} {c.city}, vertreten durch {c.representative}. E-Mail:{" "}
        <a href={`mailto:${c.email}`}>{c.email}</a>, Telefon: {c.phone}.
      </p>

      <h2>2. Was diese Anwendung ist</h2>
      <p>
        „Pforte“ ist eine Vorführung von {c.name}: das Control Panel eines API-Gateways. Der gezeigte Verkehr wird in
        Ihrem Browser simuliert, es gibt keine Verbindung zu einem echten System. Es gibt keine Registrierung, keine
        Konten und keine Datenbank. Wir erheben keine Angaben über Sie, setzen keine Cookies und verwenden keine
        Analyse- oder Werbedienste. Schriften werden von unserem eigenen Server geladen.
      </p>

      <h2>3. Speicherung in Ihrem Browser</h2>
      <p>
        Die Regeln und Einstellungen des Circuit Breakers, die Sie anlegen, speichert die Anwendung im lokalen Speicher
        (localStorage) Ihres Browsers, damit sie beim nächsten Aufruf noch da sind. Sie verlassen Ihr Gerät nicht. Text,
        den Sie in den Payload Transformer eingeben, wird nur im Browser verarbeitet und nicht gespeichert. Löschen
        können Sie die Daten über die Einstellungen Ihres Browsers. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG.
      </p>

      <h2>4. Hosting</h2>
      <p>
        Die Anwendung läuft bei Vercel Inc. in der Region Frankfurt am Main; mit Vercel besteht ein
        Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Beim Aufruf verarbeitet Vercel technisch notwendige
        Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse) zur Auslieferung und Absicherung. Rechtsgrundlage:
        Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>5. Ihre Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art.
        15 bis 21 DSGVO. Anfragen an <a href={`mailto:${c.email}`}>{c.email}</a>. Beschwerden nimmt die zuständige
        Aufsichtsbehörde entgegen: {c.authority.name}, {c.authority.street}, {c.authority.city},{" "}
        <a href={c.authority.url}>{c.authority.url}</a>.
      </p>
    </LegalPage>
  );
}
