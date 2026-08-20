/**
 * Styles for the Lorry Receipt document.
 *
 * Deliberately a plain string rather than a scoped <style> block: the same CSS
 * has to dress the LR both on screen and inside the detached window opened for
 * printing, and a single exported constant keeps those two from drifting apart.
 * Colours are hard-coded rather than themed — an LR is a printed document and
 * must look identical regardless of the operator's light/dark preference.
 */
export const LR_STYLES = `
.lr-doc {
  background: #ffffff;
  color: #04192F;
  padding: 28px 32px;
  max-width: 820px;
  margin: 0 auto;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.45;
}
.lr-doc .lr-doc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 2px solid #FF7200;
}
.lr-doc .lr-doc-brand { display: flex; align-items: center; gap: 12px; }
.lr-doc .lr-doc-brand img { width: 58px; height: auto; }
.lr-doc .lr-doc-brand h2 { margin: 0; font-size: 20px; letter-spacing: .5px; color: #04192F; }
.lr-doc .lr-doc-brand span { font-size: 10px; letter-spacing: 4px; color: #FF7200; }
.lr-doc .doc-title { text-align: right; }
.lr-doc .doc-title h3 { margin: 0; font-size: 16px; color: #04192F; }
.lr-doc .doc-title p { margin: 4px 0 0; font-size: 11px; color: #5B6B7F; }
.lr-doc .label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #5B6B7F;
  margin-bottom: 2px;
}
.lr-doc .value { font-size: 13px; font-weight: 600; color: #04192F; word-break: break-word; }
.lr-doc .lr-doc-numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 16px 0;
}
.lr-doc .lr-doc-route {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #D8DEE6;
  border-radius: 6px;
  margin-bottom: 18px;
}
.lr-doc .lr-doc-section { margin-bottom: 18px; }
.lr-doc .lr-doc-section h4 {
  margin: 0 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #FF7200;
}
.lr-doc .lr-doc-section > h4 + .lr-doc-grid { padding-top: 10px; border-top: 1px solid #D8DEE6; }
.lr-doc .lr-doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.lr-doc .lr-doc-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.lr-doc .lr-doc-grid .value + .value { margin-top: 2px; font-weight: 500; }
.lr-doc .lr-doc-instructions {
  padding-top: 10px;
  border-top: 1px solid #D8DEE6;
  font-size: 12px;
  white-space: pre-wrap;
}
.lr-doc .lr-doc-sign {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 60px;
  margin-top: 54px;
}
.lr-doc .lr-doc-sign > div {
  border-top: 1px solid #D8DEE6;
  padding-top: 6px;
  font-size: 10px;
  color: #5B6B7F;
}
.lr-doc .lr-doc-note {
  margin-top: 26px;
  text-align: center;
  font-size: 9px;
  color: #5B6B7F;
}
@media print {
  @page { size: A4; margin: 12mm; }
  .lr-doc { padding: 0; max-width: none; }
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
