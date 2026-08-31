/* ============================================================
   EVIDENCE — the data interface for real project material.

   The next real improvement to this site will not come from more shaders
   or more scroll. It will come from PROOF: one genuine panorama, one
   genuine site dataset, one genuine drawing and the quantities that came
   out of it. Phase 5 does not invent any of that. What it does is make
   sure that when the first real project arrives, publishing it is a
   CONTENT change and not another visual-system redesign.

   Rules this module enforces, in code rather than in a convention:

     · Production renders NOTHING until a real project exists. No
       placeholder sheet, no "coming soon", no empty section — the
       renderer is not even fetched (see modules/evidence.js).
     · A project without a real visual asset is not evidence, so it is
       never publishable regardless of its status field.
     · Fixtures are marked `demo: true` and can never reach production.
     · Evidence inherits the accent of the service it belongs to. It
       never introduces a fourth colour.

   ------------------------------------------------------------
   @typedef {Object} EvidenceVisual
   @property {'panorama'|'terrain'|'drawing'|'image'} kind
       What the asset IS, which is also what replaces the corresponding
       demo representation:
         panorama → replaces the procedural CAPTURE environment
         terrain  → replaces the procedural MEASURE ground
         drawing  → replaces the generated QUANTIFY plan
         image    → a photograph or render, used as a plain figure
   @property {string} src        served path; the only required asset
   @property {string} [srcset]
   @property {number} width
   @property {number} height
   @property {string} alt        REQUIRED — real content, real alt text
   @property {string} [poster]   first frame for an interactive asset
   @property {string} [credit]

   @typedef {Object} EvidenceFact
   @property {string} k   label, English technical microcopy (INPUT, OUTPUT…)
   @property {string} v   value, Hungarian or a measured figure

   @typedef {Object} EvidenceStep
   @property {'CONTEXT'|'INPUT'|'PROCESS'|'OUTPUT'|'RESULT'} k
   @property {string} c   Hungarian prose. No ROI, no percentages, no
                          lead counts — a project is compelling here
                          through technical proof alone.

   @typedef {Object} EvidenceProject
   @property {string} id                    stable slug
   @property {'capture'|'measure'|'quantify'|'mixed'} service
   @property {string} type                  PROJECT TYPE, short
   @property {string} [location]            only as specific as permitted
   @property {string} title
   @property {string} [summary]
   @property {EvidenceFact[]} facts
   @property {EvidenceVisual} visual
   @property {EvidenceStep[]} [steps]
   @property {'draft'|'published'} status
   @property {boolean} [demo]               fixture; never ships
   ------------------------------------------------------------ */

/**
 * Real projects. Empty, and it stays empty until there is a real one.
 * Adding a published entry with a real `visual.src` is the ONLY thing
 * required to make the evidence section appear — on the homepage and on
 * the matching service page, with no other change anywhere.
 * @type {EvidenceProject[]}
 */
export const PROJECTS = [];

/** A project with no real asset behind it is not evidence. */
export function isPublishable(p) {
  if (!p || p.status !== 'published') return false;
  if (p.demo && !import.meta.env.DEV) return false;
  if (!p.visual?.src || !p.visual?.alt) return false;
  return true;
}

/**
 * @param {{service?: string|null, limit?: number}} [opts]
 * @returns {EvidenceProject[]}
 */
export function getEvidence({ service = null, limit = Infinity } = {}) {
  return PROJECTS
    .filter(isPublishable)
    .filter((p) => !service || p.service === service || p.service === 'mixed')
    .slice(0, limit);
}
