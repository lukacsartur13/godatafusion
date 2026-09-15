/* ============================================================
   MESSAGES THE SERVER SENDS — and the validation lines it shares with
   the browser.

   The request endpoint answers in the language of the page the form was
   sent from (`lang` field). This is a JavaScript module rather than one
   of the JSON dictionaries because the Netlify function is bundled with
   esbuild and imports it statically; the build-time generator merges it
   into each language's dictionary, so a string here is never repeated
   in src/i18n/<lang>/*.json.

   Keys are the Hungarian strings, exactly as the code has always used
   them. `{n}` placeholders are substituted by tr() / t().
   ============================================================ */

export const MESSAGES = {
  'POST szükséges.': { en: 'POST required.', de: 'POST erforderlich.' },
  'Érvénytelen kérésformátum.': { en: 'Invalid request format.', de: 'Ungültiges Anfrageformat.' },
  'A kérés nem volt feldolgozható. Lehet, hogy a csatolmány túl nagy.': {
    en: 'The request could not be processed. The attachment may be too large.',
    de: 'Die Anfrage konnte nicht verarbeitet werden. Möglicherweise ist der Anhang zu groß.',
  },
  'Ismeretlen mező a kérésben.': { en: 'Unknown field in the request.', de: 'Unbekanntes Feld in der Anfrage.' },
  'Túl gyors beküldés. Próbálja újra néhány másodperc múlva.': {
    en: 'Submitted too quickly. Please try again in a few seconds.',
    de: 'Zu schnell abgeschickt. Bitte versuchen Sie es in einigen Sekunden erneut.',
  },
  'Túl sok kérés érkezett erről a címről. Próbálja újra később, vagy írjon közvetlenül emailben.': {
    en: 'Too many requests from this address. Please try again later, or write to us directly by email.',
    de: 'Zu viele Anfragen von dieser Adresse. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt per E-Mail.',
  },
  'Ismeretlen szolgáltatás.': { en: 'Unknown service.', de: 'Unbekannte Leistung.' },
  'Ez a mező nem tartozik a kiválasztott szolgáltatáshoz.': {
    en: 'This field does not belong to the selected service.',
    de: 'Dieses Feld gehört nicht zur gewählten Leistung.',
  },
  'Kötelező mező.': { en: 'Required field.', de: 'Pflichtfeld.' },
  'Érvényes email címet adjon meg.': { en: 'Please enter a valid email address.', de: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' },
  'Néhány szóval írja le a feladatot.': { en: 'Please describe the task in a few words.', de: 'Bitte beschreiben Sie die Aufgabe in wenigen Worten.' },
  'Legfeljebb {n} karakter.': { en: 'At most {n} characters.', de: 'Höchstens {n} Zeichen.' },
  'Válassza ki, milyen kimutatást kér.': { en: 'Please choose which schedule you need.', de: 'Bitte wählen Sie, welche Auswertung Sie benötigen.' },
  'Ismeretlen feladattípus.': { en: 'Unknown task type.', de: 'Unbekannter Aufgabentyp.' },
  'Ismeretlen eredménytípus.': { en: 'Unknown result type.', de: 'Unbekannter Ergebnistyp.' },
  'Jelölje meg, milyen eredményre van szüksége.': { en: 'Please mark which results you need.', de: 'Bitte markieren Sie, welche Ergebnisse Sie benötigen.' },
  'Legfeljebb {n} fájl csatolható.': { en: 'At most {n} files can be attached.', de: 'Es können höchstens {n} Dateien angehängt werden.' },
  'Nem támogatott formátum: {name}. Elfogadott: {formats}.': {
    en: 'Unsupported format: {name}. Accepted: {formats}.',
    de: 'Nicht unterstütztes Format: {name}. Zulässig: {formats}.',
  },
  '{name} túl nagy. Fájlonként legfeljebb {mb} MB.': {
    en: '{name} is too large. At most {mb} MB per file.',
    de: '{name} ist zu groß. Höchstens {mb} MB pro Datei.',
  },
  'A csatolmányok összmérete legfeljebb {mb} MB lehet.': {
    en: 'The attachments may total at most {mb} MB.',
    de: 'Die Anhänge dürfen zusammen höchstens {mb} MB groß sein.',
  },
  '{name} tartalma nem egyezik a kiterjesztésével. Töltse fel valódi {ext} fájlként.': {
    en: 'The content of {name} does not match its extension. Please upload it as a real {ext} file.',
    de: 'Der Inhalt von {name} passt nicht zur Dateiendung. Bitte laden Sie eine echte {ext}-Datei hoch.',
  },
  'Ehhez a szolgáltatáshoz egy reprezentatív mintarajz szükséges.': {
    en: 'This service needs one representative sample drawing.',
    de: 'Für diese Leistung ist eine repräsentative Musterzeichnung erforderlich.',
  },
  'Néhány mezőt javítani kell.': { en: 'A few fields need correcting.', de: 'Einige Felder müssen korrigiert werden.' },
  'Váratlan hiba történt a feldolgozás közben.': { en: 'An unexpected error occurred during processing.', de: 'Bei der Verarbeitung ist ein unerwarteter Fehler aufgetreten.' },
  'A csatolmány túl nagy.': { en: 'The attachment is too large.', de: 'Der Anhang ist zu groß.' },
  'Az üzenetküldés jelenleg nem elérhető.': { en: 'Sending is currently unavailable.', de: 'Das Senden ist derzeit nicht möglich.' },
};

/** A server-side message in `lang`, with `{placeholders}` filled in. */
export function tr(lang, key, vars) {
  let s = MESSAGES[key]?.[lang] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
