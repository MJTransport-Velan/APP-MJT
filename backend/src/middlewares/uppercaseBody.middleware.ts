import { Request, Response, NextFunction } from 'express';

// Field names (case-insensitive) where case is load-bearing — credentials,
// identity lookups, tokens/secrets, URLs, free text, and structured content.
// Uppercasing any of these would break login, break integrations, or destroy
// user-authored text. Keep in sync with the frontend's equivalent hint regex
// in frontend/src/components/ui/AppTextField.vue.
const EXCLUDED_KEYS = new Set([
  'username',
  'password',
  'newpassword',
  'currentpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'otp',
  'otpsecret',
  'secret',
  'apikey',
  'webhooksecret',
  'signature',
  'hash',
  'email',
  'recipientemails',
  'remarks',
  'notes',
  'description',
  'comment',
  'comments',
  'reason',
  // Customer-authored free text arriving from the public booking form — the
  // same class as remarks/notes above, and it is reproduced verbatim on the LR.
  'instructions',
  'specialinstructions',
  // Commercial wording printed verbatim on the LR ("To Be Billed",
  // "Credit 30 Days"). Shouting it would misrepresent the agreed term.
  'paymentterm',
  // "BANK:<uuid>" / "CASH:<uuid>" — an identifier pair, same class as the
  // Id-suffixed keys below. Case-mangling the uuid half is asking for a
  // lookup miss.
  'fundaccountkey',
  'tofundaccountkey',
  'purpose',
  'purposenotes',
  'resolution',
  'resolutiontext',
  'conditionjson',
  'value',
  'filename',
  'document',
  'attachment',
  'rcdocument',
  'insurancedocument',
  'permitdocument',
  'licensedocument',
  'receiptdocument',
]);

// Any field ending in "Id"/"Ids" (camelCase, capital I) is virtually always a
// UUID/foreign-key reference in this codebase (driverId, vehicleId,
// permissionIds, ...) — exclude the whole class rather than enumerate every
// reference field. Deliberately case-SENSITIVE on the "Id"/"Ids" suffix so
// ordinary words like "valid"/"paid"/"void" (lowercase id, no capital I)
// aren't false-matched.
const BARE_ID_PATTERN = /^id$/i;
const ID_SUFFIX_PATTERN = /[a-zA-Z](Id|Ids)$/;
const URL_KEY_PATTERN = /url$/i;

function shouldExclude(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    EXCLUDED_KEYS.has(lower) ||
    BARE_ID_PATTERN.test(key) ||
    ID_SUFFIX_PATTERN.test(key) ||
    URL_KEY_PATTERN.test(lower)
  );
}

function transform(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    return key && shouldExclude(key) ? value : value.toUpperCase();
  }
  if (Array.isArray(value)) {
    return value.map((item) => transform(item, key));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = transform(v, k);
    }
    return out;
  }
  return value;
}

/** Uppercases string fields in the JSON body, going forward only (no retroactive
 * data migration) — case-sensitive fields (credentials, tokens, urls, ids, free
 * text) are left untouched. Must run after express.json(), before route handlers. */
export function uppercaseBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = transform(req.body) as typeof req.body;
  }
  next();
}
