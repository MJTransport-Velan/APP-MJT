/**
 * Styles for the Lorry Receipt document.
 *
 * Deliberately a plain string rather than a scoped <style> block: the same CSS
 * has to dress the LR both on screen and inside the detached window opened for
 * printing, and a single exported constant keeps those two from drifting apart.
 * Colours are hard-coded rather than themed — an LR is a printed document and
 * must look identical regardless of the operator's light/dark preference.
 *
 * The layout mirrors backend/src/utils/lrPdf.util.ts, which renders the same
 * document as a PDF. The two are independent implementations of one design;
 * a change to either belongs in both.
 */
export const LR_STYLES = `
.lr-doc {
  background: #ffffff;
  color: #111827;
  padding: 26px 28px;
  max-width: 820px;
  margin: 0 auto;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  box-sizing: border-box;
}
.lr-doc * { box-sizing: border-box; }
.lr-doc table { border-collapse: collapse; width: 100%; }

/* ----- Header ----------------------------------------------------------- */
.lr-doc .lr-head {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1.5px solid #111827;
}
.lr-doc .lr-head-logo { width: 116px; flex: 0 0 116px; }
.lr-doc .lr-head-logo img { width: 100%; height: auto; display: block; }
.lr-doc .lr-head-brand { flex: 1 1 auto; min-width: 0; }
.lr-doc .lr-head-brand h1 {
  margin: 0 0 6px;
  font-size: 27px;
  font-weight: 700;
  letter-spacing: .2px;
  line-height: 1.1;
}
.lr-doc .lr-head-brand p { margin: 0; font-size: 11px; color: #5B6B7F; line-height: 1.6; }
.lr-doc .lr-head-brand .lr-gstin { margin-top: 4px; font-weight: 700; color: #111827; }

/* Document identity — a two-column label/value grid on the right. */
.lr-doc .lr-head-meta {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: auto auto;
  gap: 10px 18px;
  align-content: start;
  font-size: 11.5px;
}
.lr-doc .lr-head-meta dt { color: #5B6B7F; font-weight: 700; margin: 0; }
.lr-doc .lr-head-meta dd { margin: 0; font-weight: 700; }

/* ----- Shared table furniture ------------------------------------------- */
.lr-doc .lr-table { margin-top: 16px; border: 1px solid #C9CFD8; }
.lr-doc .lr-table th,
.lr-doc .lr-table td {
  border: 1px solid #C9CFD8;
  padding: 7px 8px;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}
.lr-doc .lr-table th { background: #F2F4F7; font-size: 10px; font-weight: 700; }
.lr-doc .lr-table td { font-size: 11px; }
/* The outer <table> border already draws the frame; drop the doubled edges. */
.lr-doc .lr-table tr > *:first-child { border-left: 0; }
.lr-doc .lr-table tr > *:last-child { border-right: 0; }
.lr-doc .lr-table tr:first-child > * { border-top: 0; }
.lr-doc .lr-table tr:last-child > * { border-bottom: 0; }

/* ----- Consignor / consignee -------------------------------------------- */
.lr-doc .lr-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.lr-doc .lr-party {
  border: 1px solid #C9CFD8;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  min-height: 132px;
}
.lr-doc .lr-party h2 {
  margin: 0 0 10px;
  font-size: 10.5px;
  font-weight: 700;
  color: #5B6B7F;
  letter-spacing: .3px;
}
.lr-doc .lr-party .lr-party-name { font-size: 12.5px; font-weight: 700; margin-bottom: 4px; }
.lr-doc .lr-party .lr-party-address { color: #111827; white-space: pre-line; }
/* Contact lines sit at the foot of the box whatever the address does. */
.lr-doc .lr-party .lr-party-contact { margin-top: auto; padding-top: 10px; font-weight: 700; }
.lr-doc .lr-party .lr-party-contact div + div { margin-top: 2px; }

/* ----- Goods details ----------------------------------------------------- */
.lr-doc .lr-goods-title {
  background: #F2F4F7;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .3px;
}
.lr-doc .lr-goods td.lr-goods-desc { text-align: left; }
.lr-doc .lr-goods .lr-goods-total td { font-weight: 700; background: #ffffff; }
.lr-doc .lr-goods .lr-goods-overflow td {
  font-weight: 700;
  font-size: 10px;
  color: #5B6B7F;
}

/* ----- Freight & payment ------------------------------------------------- */
.lr-doc .lr-money {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.lr-doc .lr-money-box { border: 1px solid #C9CFD8; display: flex; flex-direction: column; }
.lr-doc .lr-money-box h2 {
  margin: 0;
  padding: 7px 8px;
  background: #F2F4F7;
  border-bottom: 1px solid #C9CFD8;
  font-size: 11.5px;
  font-weight: 700;
  text-align: center;
  letter-spacing: .3px;
}
.lr-doc .lr-money-body { padding: 12px 16px; flex: 1 1 auto; }
.lr-doc .lr-charge {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}
.lr-doc .lr-charge .lr-amount { font-variant-numeric: tabular-nums; white-space: nowrap; }
.lr-doc .lr-charge-total {
  margin-top: 8px;
  padding-top: 9px;
  border-top: 1px solid #111827;
  font-size: 13.5px;
  font-weight: 700;
}
/* label : value, with the colons aligned down the column. */
.lr-doc .lr-payment {
  display: grid;
  grid-template-columns: auto 10px 1fr;
  gap: 6px 6px;
  align-items: baseline;
}
.lr-doc .lr-payment > div { padding: 2px 0; }

/* ----- Remarks, signatures, footer --------------------------------------- */
.lr-doc .lr-remarks {
  margin-top: 16px;
  border: 1px solid #C9CFD8;
  padding: 12px 14px;
  min-height: 54px;
  display: flex;
  gap: 10px;
}
.lr-doc .lr-remarks strong { flex: 0 0 auto; }
.lr-doc .lr-remarks span { white-space: pre-line; }

/* Blank band closing the document, where the three signature columns and then
   the closing note used to be. Kept as empty space so the printed sheet still
   has room for a signature or stamp added by hand; mirrors BLANK_H in the PDF
   renderer. */
.lr-doc .lr-blank {
  margin-top: 26px;
  height: 116px;
}

@media print {
  @page { size: A4 portrait; margin: 8mm; }
  .lr-doc { padding: 0; max-width: none; font-size: 10px; }
  /* An LR is one sheet — never let a block split across pages. */
  .lr-doc .lr-parties,
  .lr-doc .lr-money,
  .lr-doc .lr-remarks,
  .lr-doc table { break-inside: avoid; page-break-inside: avoid; }
}
`;

const STYLE_ELEMENT_ID = 'lr-doc-styles';

/** Injects the LR stylesheet into a document once, idempotently. */
export function ensureLrStyles(target: Document = document) {
  if (target.getElementById(STYLE_ELEMENT_ID)) return;
  const style = target.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = LR_STYLES;
  target.head.appendChild(style);
}
