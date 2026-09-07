# PHASE 12 — AZ ÉRTÉKESÍTÉSI RÉTEG

A brief: a sötét, technológiai márkanyitány marad, de az oldal elsődleges
célja mostantól az, hogy a látogatót végigvezesse —
„Értem, mit csinálnak” → „Látom, milyen eredményt kapok” →
„Ez az én projektemhez használható” → „Elküldök egy mintát / ajánlatot kérek.”

## Mi változott

### Világos / sötét ritmus — `src/styles/tone.css`
- Egyetlen mechanizmus: `data-tone="light"` a szekción újradeklarálja ugyanazokat a
  tokeneket (`--bg`, `--fg`, `--fg-NN`, rule-ok), amiket minden komponens olvas.
  A CTA gomb a világos felületen automatikusan grafit-fehérből fehér-grafit lesz.
- A három szolgáltatási szín világos felületen **tinta-változatot** kap
  (capture `#00788F`, measure `#2F7A16`, quantify `#BF3F17`, mind ≥ 4,8:1 a
  `#F5F6F7` háttéren). A szín **azonosító**, nem CTA. `data-svc="…"` bármelyik
  felületen a megfelelő változatot adja.
- A CTA mindenhol egy szín: az adott felület előtérszíne. Az egyetlen kivétel
  (a mobil fiók akcentszínű CTA-ja) megszűnt.

### Főoldal — `index.html`
| # | szekció | tónus | mi történt |
|---|---|---|---|
| 01 | Nyitány | sötét | a rail kulcsa a magyar név, CAPTURE / MEASURE / QUANTIFY másodlagos jel; readoutokban „Részletek →” |
| 02 | **Szolgáltatások** (új) | világos | három médiakártya: mintavideó / mintavideó / PDF→Excel ábra; Mire jó · Kinek · két gomb |
| 03 | Elvek | sötét | magyar szavak |
| 04 | Bejárás (descent) | sötét | a nagy szavak magyarul, a technikai tagek maradtak |
| — | Valóság (új) | sötét | teljes szélességű mintavideó, „a helyére a valódi projektfelvétel kerül” |
| 05 | **Eredmény** (új) | világos | három átalakítási sor: bemenet → feldolgozás → kimenet → eredmény, számított értékekkel |
| 06 | Részletek (chapters) | sötét | Mire jó / Milyen adat / Kinek — mindhárom fejezetnél |
| 07 | Folyamat | sötét | 6 animált állapot magyarul + a 8 lépéses sor a brief szerint |
| 08 | **Miért** | világos | 5 ügyféleredmény + Bizalom blokk |
| 09 | Ajánlat | sötét | „Van egy projektje?” + szolgáltatás-specifikus űrlap |
| 10 | Rólunk / lábléc | sötét | Impresszum, Adatkezelés, süti-nyilatkozat |

### Szolgáltatásoldalak — egységes felépítés
Mindhárom oldal ugyanabban a sorrendben válaszol: `.sv-index` csík a hero alatt,
majd 01 Mi ez? · 02 Mire jó? · 03 Kinek? (világos) · 04 Milyen adatot kérünk?
(világos) · 05 Hogyan dolgozunk? (sötét, az élő jelenet) · 06–07 Mit kap kézhez? +
Példa (világos) · Bizalom · Nagyobb projektek folyamata · 08 Ajánlatkérés.

A PÉLDA blokkok — `src/modules/examples.js`, three.js nélkül, minden eszközön:
- **Mennyiségszámítás**: PDF → felismerés → Excel csík, majd négy Excel-formájú
  munkalap (`.xls`): konszignáció, helyiségkönyv, padlóburkolat a
  `webgl/levels.js`-ből számolva; a rétegrend **jelölt illusztráció**, mert a
  modellnek nincs rétegadata és nem találunk ki olyat.
- **Területfelmérés**: mintavideó + szintvonalrajz (marching squares a
  `heightAt()` felett, a `terrain-metrics.js` szintközével) + mennyiségtábla.
- **360° kamera**: alaprajz a felvételi körrel (`levelFeatures` + `CAPTURE_ROUND`),
  mintavideó, átadási jegyzék; a kattintható 360° nézet a meglévő viewer.

### Ajánlatkérő űrlap — `src/modules/request.js`, `server/handler.mjs`
Szolgáltatás szerint változó mezők (`src/data/services.js` → `fields`):
- 360°: helyszín · feladat · kb. terület/épületméret (`size`) · alaprajz opc. · kapcsolat
- Terület: helyszín · feladat · szükséges eredmény (`outputs`: m² / m³ / fm /
  szintvonal / 3D) · terv opc. · kapcsolat
- Mennyiség: feladat típusa (`task`: konszignáció / helyiségkönyv / rétegrend /
  padlóburkolat / egyéb) · PDF mintarajz **kötelező** · leírás · kapcsolat
A szerver ugyanazokból a listákból validál; ismeretlen érték 422.
`?task=retegrend` deep link előválasztja a típust.

### Placeholder adatok
- Nincs „—” a markupban: a számított mezők üresek, és az üres mező **rejtve** van
  (`tone.css`), amíg a JS ki nem írja. Minden demoérték „demonstrációs projekt”
  címkével.
- `src/data/company.js` az egyetlen hely a cégadatoknak; `/impresszum/` és
  `/adatkezeles/` innen olvas, a „KITÖLTENDŐ” jelzők maguktól eltűnnek, ha az
  érték megvan.
- `npm run check:live` hibával áll le, amíg bármelyik placeholder áll.

### Média — `src/modules/media.js`
`public/media/` — két mintavideó (nem végleges). `preload="none"`, a forrás csak
a nézet közelében csatolódik, képen kívül szünetel; reduced motion / Save-Data /
2G esetén nincs autoplay, csak vezérlő.

## Ami a megrendelőtől kell az élesítéshez
1. Végleges e-mail, cégnév, székhely, cégjegyzékszám, adószám, képviselő,
   tárhelyszolgáltató → `src/data/company.js`.
2. Az adatkezelési tájékoztató „KITÖLTENDŐ” mezői (megőrzési idő, e-mail
   szolgáltató, hatálybalépés) + jogi ellenőrzés.
3. Végleges videók / képek a `public/media/` két helyére, és az első valódi,
   anonimizált projekt (`DEMO-TO-REAL.md`).
4. Az éles hoszton az űrlap teljes tesztje valódi `MAIL_TRANSPORT`-tal.

## QA
`node qa/p12.mjs` — headless Chrome, 1440 / 1024 / 390, minden oldal, minden új
blokk: nincs vízszintes túlcsordulás, nincs üres számított mező, nincs „—”, nincs
konzolhiba. Képek: `qa/p12/`.
