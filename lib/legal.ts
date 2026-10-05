// Unternehmensfakten für Impressum und Datenschutz. Übernommen aus ../website/lib/site.ts
// (dort die einzige Quelle). Nichts hier ist erfunden; was dort fehlt, fehlt auch hier.
export const company = {
  name: "BKS Technologies",
  legalName: "BKS Technologies UG (haftungsbeschränkt)",
  url: "https://bkstechnologies.de",
  street: "Altvaterstraße 78",
  zip: "82538",
  city: "Geretsried",
  country: "Deutschland",
  representative: "Brandon Haydl",
  email: "info@bkstechnologies.de",
  phone: "0155 6398 1188",
  phoneIntl: "+4915563981188",
  registry: { court: "Amtsgericht München", number: "HRB 310983" },
  authority: {
    name: "Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)",
    street: "Promenade 18",
    city: "91522 Ansbach",
    url: "https://www.lda.bayern.de",
  },
} as const;
