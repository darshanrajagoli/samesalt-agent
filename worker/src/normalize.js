// Salt-composition normalisation, ported 1:1 from SameSalt's pipeline/normalize.py
// (the code that built the 246,068-row medicine database), so a composition read
// off a strip at runtime produces the same canonical key as the database rows.
//
// Canonical key = sorted salts with standardised strengths, then dosage form,
// then release type:  "amoxicillin:500mg+clavulanic acid:125mg|tablet"
// Two products are interchangeable candidates ONLY if their keys are identical.

export const SPELLING_MAP = {
  amoxycillin: 'amoxicillin',
  cephalexin: 'cefalexin',
  cephadroxil: 'cefadroxil',
  chlorpheniramine: 'chlorphenamine',
  frusemide: 'furosemide',
  lignocaine: 'lidocaine',
  metformine: 'metformin',
  norfloxacine: 'norfloxacin',
  ofloxacine: 'ofloxacin',
  phenobarbitone: 'phenobarbital',
  rifampicine: 'rifampicin',
  sulphadiazine: 'sulfadiazine',
  sulphamethoxazole: 'sulfamethoxazole',
  sulphasalazine: 'sulfasalazine',
  thiopentone: 'thiopental',
  adrenaline: 'epinephrine',
  noradrenaline: 'norepinephrine',
  bendrofluazide: 'bendroflumethiazide',
  chlorthalidone: 'chlortalidone',
  'glyceryl trinitrate': 'nitroglycerin',
  isoprenaline: 'isoproterenol',
  pethidine: 'meperidine',
  salbutamol: 'albuterol',
  trimethoprime: 'trimethoprim',
};

// Narrow-therapeutic-index stems: substitution is never suggested for these.
export const NTI_STEMS = [
  'warfarin', 'acenocoumarol', 'phenytoin', 'fosphenytoin', 'lithium',
  'levothyroxine', 'thyroxine', 'liothyronine', 'cyclosporine', 'ciclosporin',
  'cyclosporin', 'digoxin', 'carbamazepine', 'valproic acid', 'valproate',
  'divalproex', 'theophylline', 'aminophylline', 'tacrolimus', 'sirolimus',
  'everolimus', 'mycophenolate', 'mycophenolic acid', 'clonidine',
  'procainamide', 'disopyramide', 'quinidine',
];

const UNIT_TO_MG = {
  g: 1000, gm: 1000, gram: 1000, grams: 1000, kg: 1_000_000,
  mg: 1, mcg: 0.001, ug: 0.001, microgram: 0.001, micrograms: 0.001,
};

const RELEASE_PATTERNS = [
  [/\b(?:sr|sustained[- ]?release)\b/, 'SR'],
  [/\b(?:xr|extended[- ]?release|er)\b/, 'XR'],
  [/\b(?:cr|controlled[- ]?release)\b/, 'CR'],
  [/\b(?:mr|modified[- ]?release)\b/, 'MR'],
  [/\b(?:dr|delayed[- ]?release|enteric[- ]?coated|ec)\b/, 'DR'],
  [/\b(?:la|long[- ]?acting)\b/, 'LA'],
  [/\b(?:xl)\b/, 'XL'],
  [/\bretard\b/, 'SR'],
];

const FORM_PATTERNS = [
  [/\b(?:tablet|tab)\b/, 'tablet'],
  [/\b(?:capsule|cap)\b/, 'capsule'],
  [/\b(?:syrup|suspension|liquid|solution|oral solution|drops)\b/, 'liquid'],
  [/\b(?:injection|inj|vial|ampoule)\b/, 'injection'],
  [/\b(?:cream|ointment|gel|lotion|topical)\b/, 'topical'],
  [/\b(?:inhaler|respule|rotacap|nebulisation)\b/, 'inhaler'],
  [/\b(?:eye drop|ear drop|nasal drop|ophthalmic)\b/, 'drops'],
  [/\b(?:suppository|pessary)\b/, 'suppository'],
  [/\b(?:patch|transdermal)\b/, 'patch'],
  [/\b(?:powder|sachet|granule)\b/, 'powder'],
  [/\b(?:spray|nasal spray)\b/, 'spray'],
  [/\b(?:mouth ?wash|gargle)\b/, 'mouthwash'],
  [/\b(?:lozenge|pastille)\b/, 'lozenge'],
  [/\b(?:chewable)\b/, 'chewable'],
  [/\b(?:effervescent)\b/, 'effervescent'],
  [/\b(?:dry syrup|dry suspension)\b/, 'dry_syrup'],
  [/\b(?:respules?)\b/, 'respule'],
];

export function normalizeSpelling(salt) {
  const lower = salt.trim().toLowerCase();
  return SPELLING_MAP[lower] ?? lower;
}

// Python's f"{float}" formatting for the values we produce (e.g. 0.25, 2.5, 0.1).
function pyFloat(v) {
  if (Number.isInteger(v)) return `${v}.0`;
  return String(v);
}

/** '0.5g' -> '500mg', '250mcg' -> '0.25mg', '10%' -> '10%'. Mirrors standardize_strength(). */
export function standardizeStrength(text) {
  const re = /(\d+\.?\d*)\s*(g|gm|gram|grams|kg|mg|mcg|ug|microgram|micrograms|ml|iu|units?|meq|%|w\/v|w\/w)\b/gi;
  return text.replace(re, (_m, num, unitRaw) => {
    const unit = unitRaw.toLowerCase();
    if (unit === '%' || unit === 'w/v' || unit === 'w/w') return `${num}%`;
    if (unit === 'iu') return `${num}IU`;
    if (unit === 'meq') return `${num}mEq`;
    if (unit === 'ml') return `${num}ml`;
    if (unit === 'units' || unit === 'unit') return `${num}units`;
    const factor = UNIT_TO_MG[unit] ?? 1;
    // Round away float noise (0.65 * 1000 = 650.0000000000001).
    const mg = Math.round(parseFloat(num) * factor * 1e6) / 1e6;
    return Number.isInteger(mg) ? `${mg}mg` : `${pyFloat(mg)}mg`;
  });
}

export function extractReleaseType(text) {
  const lower = (text || '').toLowerCase();
  for (const [re, rel] of RELEASE_PATTERNS) if (re.test(lower)) return rel;
  return null;
}

export function extractDosageForm(text) {
  const lower = (text || '').toLowerCase();
  for (const [re, form] of FORM_PATTERNS) if (re.test(lower)) return form;
  return null;
}

/** "Amoxycillin (500mg) + Clavulanic Acid (125mg)" -> [["amoxicillin","500mg"],["clavulanic acid","125mg"]] */
export function parseSaltComposition(raw) {
  if (!raw || ['na', 'nan', '', '-', 'not available'].includes(raw.trim().toLowerCase())) return [];
  const parts = raw.trim().split(/\s*\+\s*/);
  const salts = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    let strengthRaw = '';
    let saltName;
    const paren = part.match(/\(([^)]+)\)/);
    if (paren) {
      strengthRaw = paren[1].trim();
      saltName = part.replace(/\s*\([^)]+\)\s*/g, ' ').trim();
    } else {
      const trailing = part.match(/(\d+\.?\d*\s*(?:g|gm|mg|mcg|ug|ml|iu|units?|meq|%|w\/v|w\/w)\b.*?)$/i);
      if (trailing) {
        strengthRaw = trailing[1].trim();
        saltName = part.slice(0, trailing.index).trim();
      } else {
        saltName = part;
      }
    }
    saltName = saltName.replace(/\b(?:IP|BP|USP|Ph\.?\s*Eur\.?|NF)\b/gi, '').trim();
    saltName = saltName.replace(/[ ,;:-]+$/, '');
    if (!saltName) continue;
    salts.push([normalizeSpelling(saltName), strengthRaw ? standardizeStrength(strengthRaw) : '']);
  }
  salts.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return salts;
}

export function buildCanonicalKey(salts, dosageForm = null, releaseType = null) {
  if (!salts.length) return '';
  let key = salts.map(([n, s]) => (s ? `${n}:${s}` : n)).join('+');
  if (dosageForm) key += `|${dosageForm}`;
  if (releaseType) key += `|${releaseType}`;
  return key;
}

export function isNti(salts) {
  return salts.some(([name]) => NTI_STEMS.some((stem) => name.includes(stem)));
}

/** Convenience: composition text + name/form hints -> canonical key. */
export function keyFor(composition, { name = '', form = '' } = {}) {
  const salts = parseSaltComposition(composition);
  const dosage = extractDosageForm(form) || extractDosageForm(name);
  const release = extractReleaseType(name) || extractReleaseType(composition);
  return { salts, key: buildCanonicalKey(salts, dosage, release), form: dosage, release, nti: isNti(salts) };
}

/** Human label for a key: "Paracetamol 650 mg · tablet". */
export function describeKey(key) {
  if (!key) return '';
  const [saltPart, form, rel] = key.split('|');
  const salts = saltPart.split('+').map((s) => {
    const [n, st] = s.split(':');
    const name = n.replace(/\b\w/g, (c) => c.toUpperCase());
    return st ? `${name} ${st.replace(/(\d)(mg|ml|IU|mEq|units|%)$/, '$1 $2')}` : name;
  });
  return [salts.join(' + '), form, rel].filter(Boolean).join(' · ');
}
