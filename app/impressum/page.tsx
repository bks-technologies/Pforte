import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { company as c } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

/** Angaben wie im Impressum der Website (bkstechnologies.de); Quelle ist ../website/lib/site.ts. */
export default function Page() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {c.legalName}
        <br />
        {c.street}
        <br />
        {c.zip} {c.city}
        <br />
        {c.country}
      </p>
      <h2>Vertreten durch</h2>
      <p>Geschäftsführer: {c.representative}</p>
      <h2>Kontakt</h2>
      <p>
        Telefon: <a href={`tel:${c.phoneIntl}`}>{c.phone}</a>
        <br />
        E-Mail: <a href={`mailto:${c.email}`}>{c.email}</a>
      </p>
      <h2>Registereintrag</h2>
      <p>
        Eintragung im Handelsregister
        <br />
        Registergericht: {c.registry.court}
        <br />
        Registernummer: {c.registry.number}
      </p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {c.representative}
        <br />
        {c.street}
        <br />
        {c.zip} {c.city}
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
      <h2>Haftung für Inhalte</h2>
      <p>
        Diese Anwendung ist eine Vorführung mit Beispieldaten. Als Diensteanbieter sind wir für eigene Inhalte nach den
        allgemeinen Gesetzen verantwortlich. Systeme, Firmen- und Artikelnamen in der Vorführung sind erfunden.
      </p>
    </LegalPage>
  );
}
