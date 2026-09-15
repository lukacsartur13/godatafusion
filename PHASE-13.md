# PHASE 13–14 — A FŐOLDAL ÖSSZEHÚZÁSA ÉS A HÁROM NYELV

Két kérés, egy fázisban.

1. A főoldal legyen rövid és konverzióra vigyen: csak a nyitány, az
   eredmény, a részletek és a „miért” marad, és a szekciók között **ne
   legyen látható határ** — egy dokumentumnak kell olvasódnia.
2. Az oldal legyen **háromnyelvű**: teljes magyar, teljes angol, teljes
   német verzió.

---

## 1. A főoldal

### Ami maradt

| # | szekció | tónus | mi ez |
|---|---|---|---|
| 01 | Nyitány | világos | hero, a három szolgáltatás rail-je, élő jelenet |
| — | **Híd** | sötét | a mintavideó, egy képernyőnyit megtartva |
| 02 | Eredmény | világos | bemenet → feldolgozás → kimenet, számított értékekkel |
| 03 | **Adat** | sötét | a tervlap, és a belőle kiolvasott nyolc szám |
| 04 | Részletek | sötét | a három fejezet az élő jelenet fölött |
| 05 | Miért | világos | 5 ügyféleredmény + Bizalom |
| 06 | Ajánlat | sötét | a szolgáltatás-specifikus űrlap |

### Ami lekerült

`02 Szolgáltatások`, `03 Elvek`, `04 Bejárás`, `07 Folyamat`, `10 Rólunk`.
A tartalmuk nem veszett el: az **Elvek** és a **Folyamat** a `/rolunk/`
oldalra került, a három szolgáltatás a saját oldalán és a fejlécben él, a
**Rólunk** önálló dokumentum lett.

A `styles/manifesto.css`, `styles/fusion.css` és `styles/descent.css`
importja kikerült a `main.css`-ből — együtt 1 052 sor, amit minden
látogató letöltött volna és semmire nem illeszkedett volna. A fájlok a
lemezen maradnak; a modulok nincsenek importálva, így a bundle-ből
kiesnek.

### A négyes rész vége — az ADAT mező

A bejárás utolsó képe volt az egyetlen, aminek meg kellett maradnia: a
rajz, és fölötte a számok, amiket **a rajzból** olvastunk ki. Ez most a
**Részletek vége** — nem utána tett blokk, hanem a fejezetek zárlata
(`modules/datafield.js`, `styles/seam.css` §04). Mindhárom fejezet egy-egy
olvasatot adott ugyanarról a helyszínről; ez az, amivé a három együtt
válik. Fölötte nincs él, és a blokknak nincs saját alapja sem: átlátszó.
Utána ugyanúgy ad át, ahogy a híd — a Miért világos alapja ráemelkedik a
tartott képre.

**És a rajz az élő jelenet.** A harmadik fejezet utolsó képernyőjén a
jelenet feloldódik egyetlen szint alaprajzává: minden, ami nem a
vonalrajz — terep, tömeg, pontfelhő, élek, maga az épületszerkezet —
elhalványul nullára, a rajzra kivetett mérési feliratok vele együtt, és
ami marad, az a vonalháló, amiről a számokat leolvastuk. A blokk nem rajzol
saját alaprajzot: ugyanaz az objektum, amit az olvasó a nyitány óta néz,
megérkezik abba az állapotba, amit az oldal végig állított. Egy lapos
másolat itt a mondandó képe lenne a mondandó helyett.

Két új kapcsoló a jelenetben (`webgl/scene.js`):

| kapcsoló | mit csinál |
|---|---|
| `setDrawingOnly(v)` | 0 a komponált kép, 1 csak az alaprajz vonalhálója |
| `setCallouts(v)` | minden kivetített feliratcsalád jelenléte egyszerre |

Mindkettő **értéket vesz át, nem időtartamot**: a görgetés az óra, egy
tween második óra lenne mellette. Mindkettő szorzó a feloldott rétegkészlet
fölött, nem új preset — így azt az állapotot csökkenti, amiben az olvasó
épp van, és nincs mihez szinkronban maradnia.

Három dolog, ami közben kiderült, és mindhárom valódi hiba volt:

- A sötét futam **nem a fejezetekkel ért véget**. Az alapváltó a Részletek
  aljáig tartott, így az átlátszó adatmező világos vásznat kapott, rajta egy
  blokknyi fehér tipográfiával.
- A blokknak **túl kell élnie azt, akitől a képet átvette**. A narratíva
  0,35 mp-es scrub-farka a saját vége után is ír: a legutolsó írása —
  három szint, oldalra tolt objektum — a mező utolsó írása UTÁN érkezett.
  A mező triggere ezért a teljes blokkot fogja át, a feloldás pedig az
  első képernyőnyi útra van leképezve.
- A főoldal kiírásai **angolul voltak** (`DOORS`, `WINDOWS`, `PCS`) egy
  magyar-első oldalon, és a MEASURE három értéke beírt szám volt. Mind a
  kilenc a szótáron megy át, a három érték pedig a terepmetrikából jön.

Csökkentett mozgásnál a végállapot jelenik meg, út nélkül; WebGL nélkül a
blokk kirajzolja a statikus alaprajzot, mert akkor nincs mi feloldódjon.

Ez időzítési szabály, mielőtt stílus lenne. A kép egy képernyőnyit áll, és
minden, ami rajta van — a rajz, a nyolc szám, a záró mondat — **készen van,
mire a tartás elenged** (`--t` 0,60-nál végez, az elengedés 0,67-nél van).
Ami utána elgördül, egy kész, nyugvó kép, és a fejezetek közvetlenül a
széle alatt jönnek: nincs sehol rés, amiben egy szekcióhatár megülhetne.

Nincs benne egyetlen beírt érték sem. A nyolc szám ugyanabból a
helyiség-geometriából (`webgl/levels.js`) számolódik, amiből a mögötte
lévő alaprajz rajzolódik — ezért nem tud a kettő ellentmondani egymásnak.
Ez maga az állítás, szerkezetileg.

### Az átmenetek

Három eszköz, több nincs.

- **A híd.** A mintavideó egy képernyőnyit áll (`sticky`), miközben a hero
  vászna elhagyja mögötte, majd a világos eredmény-alap ráemelkedik. Egy
  átlátszatlan szekció, ami egy `sticky` fölé gördül, ingyen ad törlést és
  nem tud kicsúszni a szinkronból.
- **Az ADAT mező.** Ugyanez, de tartalommal: a sötét alap a világos fölé
  emelkedik, a számok olvasási sorrendben érkeznek, a záró mondat utolsóként.
- **A varratsávok.** Két alap között soha nincs vonal. Van egy sáv, aminek
  a háttere a fenti és a lenti alap közötti átmenet, és egy hajszálvonal,
  ami az olvasóval együtt rajzolódik.

Minden `[data-seam]` egyetlen számot kap (`--t`, 0 → 1), a többit a CSS
interpolálja — `modules/seams.js`.

### A fejléc

A fejléc útvonal-index lett, nem tartalomjegyzék: **Szolgáltatások**
(lenyíló, a három oldallal), **Rólunk**, **Kapcsolat**, és a
**PROJEKT INDÍTÁSA**. Minden más elem a főoldal egy szekciójára mutatott,
és azok a szekciók ma dokumentumok.

---

## 2. A három nyelv

Egyetlen forrás: a magyar dokumentumok. Az angol és a német oldalak
**build időben generálódnak** belőlük (`tools/i18n/core.mjs`), valódi
könyvtárakba, lefordított útvonalakkal.

```
/                      /en/                   /de/
/360-camera/           /en/360-camera/        /de/360-kamera/
/teruletfelmeres/      /en/site-survey/       /de/gelaendeaufmass/
/mennyisegszamitas/    /en/quantity-takeoff/  /de/mengenermittlung/
/rolunk/               /en/about/             /de/ueber-uns/
/kapcsolat/            /en/contact/           /de/kontakt/
/impresszum/           /en/imprint/           /de/impressum/
/adatkezeles/          /en/privacy/           /de/datenschutz/
```

Nincs kliensoldali fordítás, nincs cookie, nincs böngészőnyelv szerinti
átirányítás: **egy nyelv egy URL**.

### Ami fordul

| réteg | hol | hogyan |
|---|---|---|
| markup | a hét magyar HTML | `src/i18n/<lang>/*.json`, a magyar mondat a kulcs |
| JS által írt szöveg | űrlap, 360° nézet, táblázatok | `t()` — `src/i18n/t.js`, a szótár a lapba ágyazva |
| szerver válaszok | `/api/project-request` | `src/i18n/messages.js`, az űrlap elküldi a `lang`-ot |
| számformátum | minden származtatott érték | `fmtNum()` — hu `1 248,62`, en `1,248.62`, de `1.248,62` |

### Parancsok

```bash
npm run i18n                     # újragenerálja /en/ és /de/ tartalmát
npm run i18n -- --extract        # a még hiányzó kulcsok, dokumentum-sorrendben
node tools/i18n/missing.mjs de   # amit a német markup még nem tud
node tools/i18n/runtime-missing.mjs de   # amit a német kód még nem tud
```

`npm test` hibával áll le, ha bármelyik nyelv bármelyik sora hiányzik, ha
két szótárfájl ugyanazt a kulcsot másképp fordítja, ha egy lefordított
dokumentumból link mutat ki a saját nyelvéből, vagy ha egy szerverüzenet
elveszti a helyettesítő jelét.

---

## Ami a megrendelőtől kell

Változatlanul: `src/data/company.js` mezői, az adatkezelési tájékoztató
kitöltendő pontjai, a végleges média, és az űrlap éles tesztje. Az angol
és a német jogi szöveget élesítés előtt ugyanúgy ellenőriztetni kell, mint
a magyart.
