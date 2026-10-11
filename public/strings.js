// All user-facing text, in English, Kannada and Hindi. Shared by the web app and the
// Worker (which composes the spoken/written answer). Keep placeholders like {n} intact.
// Kannada and Hindi were written by hand and reviewed with AgentFoundry's SMART-Code
// assistant (see docs/AGENTFOUNDRY.md); corrections from field volunteers are welcome.

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिन्दी' },
];

export const STRINGS = {
  en: {
    tagline: 'Same medicine. Lower price.',
    intro: 'Photograph a medicine strip or type its name. SameSalt shows every brand with exactly the same salt and strength, the government Jan Aushadhi price, and the nearest Jan Aushadhi Kendra.',
    scan: 'Scan a medicine strip',
    scanHint: 'Take a clear photo of the side with the name and composition.',
    orType: 'or type the name',
    placeholder: 'e.g. Dolo 650',
    pinLabel: 'PIN code (optional)',
    pinHint: 'To find the nearest Jan Aushadhi Kendra',
    check: 'Check',
    useLocation: 'Use my location',
    reading: 'Reading the strip…',
    checking: 'Checking…',
    youHave: 'Your medicine',
    contains: 'Contains',
    sameSaltTitle: 'Same salt, same strength',
    brandsCount: '{n} brands',
    cheapest: 'Lowest-priced brands',
    perUnit: { tablet: 'per tablet', capsule: 'per capsule', ml: 'per ml', unit: 'per unit' },
    packOf: 'Pack of {n}: {price}',
    yours: 'Yours',
    jaTitle: 'Jan Aushadhi generic',
    jaMrp: 'Government MRP',
    jaNone: 'This exact salt and strength is not in the Jan Aushadhi list.',
    jaPending: 'Jan Aushadhi prices are not loaded yet.',
    kendraTitle: 'Nearest Jan Aushadhi Kendras',
    kendraNeedPin: 'Add your PIN code to see the nearest Kendras.',
    kendraNone: 'No Kendra found for this PIN code in the official list.',
    kendraPending: 'The Kendra list is not loaded yet.',
    directions: 'Directions',
    call: 'Call',
    saveUpTo: 'Save up to {amount} on one pack',
    safety: 'SameSalt only shows medicines with the same salt, the same strength and the same form. Ask your doctor or pharmacist before you switch. SameSalt does not give dosage advice.',
    nti: 'Do not switch this medicine on your own. It needs an exact dose, and changing brands can be unsafe. Talk to your doctor.',
    notFound: 'We could not find this medicine. Type the name exactly as printed on the strip.',
    visionFallback: 'Reading the photo on this phone instead…',
    switchQ: 'Did you buy a cheaper option?',
    switchYes: 'Yes, I switched',
    switchAsk: 'I will ask my doctor',
    switchNo: 'No',
    thanks: 'Thank you. This helps us measure real savings.',
    pharmacistBtn: 'Show to the pharmacist',
    pharmacistCard: 'Please give me the lowest-priced medicine with exactly this composition:',
    close: 'Close',
    stepsTitle: 'How SameSalt worked this out',
    privacy: 'No photos, names or phone numbers are stored. We count anonymous lookups to measure savings.',
    impactLink: 'See the impact',
    volunteer: 'Volunteer mode',
    volunteerOn: 'Volunteer mode is on: lookups are counted as helped by a volunteer.',
    dataNote: 'Brand prices are printed MRPs from a 2022 dataset and may have changed. Jan Aushadhi prices are from the official PMBJP list ({date}).',
    language: 'Language',
    listen: 'Listen',
    another: 'Check another medicine',
  },

  kn: {
    tagline: 'ಅದೇ ಔಷಧಿ. ಕಡಿಮೆ ಬೆಲೆ.',
    intro: 'ಔಷಧಿ ಸ್ಟ್ರಿಪ್‌ನ ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಅದರ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ. ಅದೇ ಸಾಲ್ಟ್ ಮತ್ತು ಅದೇ ಪ್ರಮಾಣದ ಎಲ್ಲಾ ಬ್ರ್ಯಾಂಡ್‌ಗಳು, ಸರ್ಕಾರದ ಜನ ಔಷಧಿ ಬೆಲೆ ಮತ್ತು ಹತ್ತಿರದ ಜನ ಔಷಧಿ ಕೇಂದ್ರವನ್ನು SameSalt ತೋರಿಸುತ್ತದೆ.',
    scan: 'ಔಷಧಿ ಸ್ಟ್ರಿಪ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    scanHint: 'ಹೆಸರು ಮತ್ತು ಸಂಯೋಜನೆ ಇರುವ ಭಾಗದ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
    orType: 'ಅಥವಾ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ',
    placeholder: 'ಉದಾ: Dolo 650',
    pinLabel: 'ಪಿನ್ ಕೋಡ್ (ಐಚ್ಛಿಕ)',
    pinHint: 'ಹತ್ತಿರದ ಜನ ಔಷಧಿ ಕೇಂದ್ರವನ್ನು ಹುಡುಕಲು',
    check: 'ಪರಿಶೀಲಿಸಿ',
    useLocation: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ',
    reading: 'ಸ್ಟ್ರಿಪ್ ಓದಲಾಗುತ್ತಿದೆ…',
    checking: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    youHave: 'ನಿಮ್ಮ ಔಷಧಿ',
    contains: 'ಇದರಲ್ಲಿ ಇದೆ',
    sameSaltTitle: 'ಅದೇ ಸಾಲ್ಟ್, ಅದೇ ಪ್ರಮಾಣ',
    brandsCount: '{n} ಬ್ರ್ಯಾಂಡ್‌ಗಳು',
    cheapest: 'ಅತಿ ಕಡಿಮೆ ಬೆಲೆಯ ಬ್ರ್ಯಾಂಡ್‌ಗಳು',
    perUnit: { tablet: 'ಪ್ರತಿ ಮಾತ್ರೆಗೆ', capsule: 'ಪ್ರತಿ ಕ್ಯಾಪ್ಸೂಲ್‌ಗೆ', ml: 'ಪ್ರತಿ ಮಿ.ಲೀ.ಗೆ', unit: 'ಪ್ರತಿ ಘಟಕಕ್ಕೆ' },
    packOf: 'ಪ್ಯಾಕ್ ({n}): {price}',
    yours: 'ನಿಮ್ಮದು',
    jaTitle: 'ಜನ ಔಷಧಿ (ಜೆನೆರಿಕ್)',
    jaMrp: 'ಸರ್ಕಾರಿ ಎಂಆರ್‌ಪಿ',
    jaNone: 'ಇದೇ ಸಾಲ್ಟ್ ಮತ್ತು ಇದೇ ಪ್ರಮಾಣದ ಔಷಧಿ ಜನ ಔಷಧಿ ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ.',
    jaPending: 'ಜನ ಔಷಧಿ ಬೆಲೆಗಳನ್ನು ಇನ್ನೂ ಸೇರಿಸಿಲ್ಲ.',
    kendraTitle: 'ಹತ್ತಿರದ ಜನ ಔಷಧಿ ಕೇಂದ್ರಗಳು',
    kendraNeedPin: 'ಹತ್ತಿರದ ಕೇಂದ್ರಗಳನ್ನು ನೋಡಲು ನಿಮ್ಮ ಪಿನ್ ಕೋಡ್ ನಮೂದಿಸಿ.',
    kendraNone: 'ಅಧಿಕೃತ ಪಟ್ಟಿಯಲ್ಲಿ ಈ ಪಿನ್ ಕೋಡ್‌ಗೆ ಯಾವುದೇ ಕೇಂದ್ರ ಸಿಗಲಿಲ್ಲ.',
    kendraPending: 'ಕೇಂದ್ರಗಳ ಪಟ್ಟಿಯನ್ನು ಇನ್ನೂ ಸೇರಿಸಿಲ್ಲ.',
    directions: 'ದಾರಿ ತೋರಿಸಿ',
    call: 'ಕರೆ ಮಾಡಿ',
    saveUpTo: 'ಒಂದು ಪ್ಯಾಕ್‌ನಲ್ಲಿ {amount} ವರೆಗೆ ಉಳಿಸಿ',
    safety: 'ಅದೇ ಸಾಲ್ಟ್, ಅದೇ ಪ್ರಮಾಣ ಮತ್ತು ಅದೇ ರೂಪದ ಔಷಧಿಗಳನ್ನು ಮಾತ್ರ SameSalt ತೋರಿಸುತ್ತದೆ. ಔಷಧಿ ಬದಲಾಯಿಸುವ ಮೊದಲು ನಿಮ್ಮ ವೈದ್ಯರು ಅಥವಾ ಫಾರ್ಮಸಿಸ್ಟ್ ಅವರನ್ನು ಕೇಳಿ. SameSalt ಡೋಸ್ ಬಗ್ಗೆ ಸಲಹೆ ನೀಡುವುದಿಲ್ಲ.',
    nti: 'ಈ ಔಷಧಿಯನ್ನು ನೀವೇ ಬದಲಾಯಿಸಬೇಡಿ. ಇದಕ್ಕೆ ನಿಖರವಾದ ಡೋಸ್ ಬೇಕು, ಬ್ರ್ಯಾಂಡ್ ಬದಲಾಯಿಸುವುದು ಅಪಾಯಕಾರಿಯಾಗಬಹುದು. ನಿಮ್ಮ ವೈದ್ಯರೊಂದಿಗೆ ಮಾತನಾಡಿ.',
    notFound: 'ಈ ಔಷಧಿ ಸಿಗಲಿಲ್ಲ. ಸ್ಟ್ರಿಪ್ ಮೇಲೆ ಮುದ್ರಿಸಿರುವಂತೆಯೇ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ.',
    visionFallback: 'ಫೋಟೋವನ್ನು ಈ ಫೋನ್‌ನಲ್ಲೇ ಓದಲಾಗುತ್ತಿದೆ…',
    switchQ: 'ನೀವು ಕಡಿಮೆ ಬೆಲೆಯ ಔಷಧಿ ಖರೀದಿಸಿದಿರಾ?',
    switchYes: 'ಹೌದು, ಬದಲಾಯಿಸಿದ್ದೇನೆ',
    switchAsk: 'ವೈದ್ಯರನ್ನು ಕೇಳುತ್ತೇನೆ',
    switchNo: 'ಇಲ್ಲ',
    thanks: 'ಧನ್ಯವಾದಗಳು. ನಿಜವಾದ ಉಳಿತಾಯವನ್ನು ಅಳೆಯಲು ಇದು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    pharmacistBtn: 'ಫಾರ್ಮಸಿಸ್ಟ್‌ಗೆ ತೋರಿಸಿ',
    pharmacistCard: 'ದಯವಿಟ್ಟು ಇದೇ ಸಂಯೋಜನೆಯ ಅತಿ ಕಡಿಮೆ ಬೆಲೆಯ ಔಷಧಿ ಕೊಡಿ:',
    close: 'ಮುಚ್ಚಿ',
    stepsTitle: 'SameSalt ಇದನ್ನು ಹೇಗೆ ಕಂಡುಹಿಡಿಯಿತು',
    privacy: 'ಫೋಟೋ, ಹೆಸರು ಅಥವಾ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು ನಾವು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ಉಳಿತಾಯ ಅಳೆಯಲು ಹೆಸರಿಲ್ಲದ ಹುಡುಕಾಟಗಳನ್ನು ಮಾತ್ರ ಎಣಿಸುತ್ತೇವೆ.',
    impactLink: 'ಪರಿಣಾಮ ನೋಡಿ',
    volunteer: 'ಸ್ವಯಂಸೇವಕ ಮೋಡ್',
    volunteerOn: 'ಸ್ವಯಂಸೇವಕ ಮೋಡ್ ಆನ್ ಆಗಿದೆ: ಹುಡುಕಾಟಗಳನ್ನು ಸ್ವಯಂಸೇವಕರ ಸಹಾಯವಾಗಿ ಎಣಿಸಲಾಗುತ್ತದೆ.',
    dataNote: 'ಬ್ರ್ಯಾಂಡ್ ಬೆಲೆಗಳು 2022ರ ಡೇಟಾಸೆಟ್‌ನ ಮುದ್ರಿತ ಎಂಆರ್‌ಪಿಗಳು, ಈಗ ಬದಲಾಗಿರಬಹುದು. ಜನ ಔಷಧಿ ಬೆಲೆಗಳು ಅಧಿಕೃತ PMBJP ಪಟ್ಟಿಯಿಂದ ({date}).',
    language: 'ಭಾಷೆ',
    listen: 'ಕೇಳಿ',
    another: 'ಇನ್ನೊಂದು ಔಷಧಿ ಪರಿಶೀಲಿಸಿ',
  },

  hi: {
    tagline: 'वही दवा। कम दाम।',
    intro: 'दवा की पट्टी की फ़ोटो लें या उसका नाम लिखें। SameSalt बिल्कुल वही सॉल्ट और वही मात्रा वाले सभी ब्रांड, जन औषधि की सरकारी कीमत और सबसे नज़दीकी जन औषधि केंद्र दिखाता है।',
    scan: 'दवा की पट्टी स्कैन करें',
    scanHint: 'नाम और कंपोज़िशन वाले हिस्से की साफ़ फ़ोटो लें।',
    orType: 'या नाम लिखें',
    placeholder: 'जैसे Dolo 650',
    pinLabel: 'पिन कोड (वैकल्पिक)',
    pinHint: 'सबसे नज़दीकी जन औषधि केंद्र खोजने के लिए',
    check: 'जाँचें',
    useLocation: 'मेरी लोकेशन इस्तेमाल करें',
    reading: 'पट्टी पढ़ी जा रही है…',
    checking: 'जाँच हो रही है…',
    youHave: 'आपकी दवा',
    contains: 'इसमें है',
    sameSaltTitle: 'वही सॉल्ट, वही मात्रा',
    brandsCount: '{n} ब्रांड',
    cheapest: 'सबसे कम दाम वाले ब्रांड',
    perUnit: { tablet: 'प्रति गोली', capsule: 'प्रति कैप्सूल', ml: 'प्रति ml', unit: 'प्रति यूनिट' },
    packOf: 'पैक ({n}): {price}',
    yours: 'आपकी',
    jaTitle: 'जन औषधि (जेनेरिक)',
    jaMrp: 'सरकारी MRP',
    jaNone: 'यही सॉल्ट और मात्रा जन औषधि सूची में नहीं है।',
    jaPending: 'जन औषधि के दाम अभी जोड़े नहीं गए हैं।',
    kendraTitle: 'सबसे नज़दीकी जन औषधि केंद्र',
    kendraNeedPin: 'नज़दीकी केंद्र देखने के लिए अपना पिन कोड डालें।',
    kendraNone: 'आधिकारिक सूची में इस पिन कोड के लिए कोई केंद्र नहीं मिला।',
    kendraPending: 'केंद्रों की सूची अभी जोड़ी नहीं गई है।',
    directions: 'रास्ता देखें',
    call: 'कॉल करें',
    saveUpTo: 'एक पैक पर {amount} तक बचाएँ',
    safety: 'SameSalt सिर्फ़ वही सॉल्ट, वही मात्रा और वही रूप वाली दवाएँ दिखाता है। दवा बदलने से पहले अपने डॉक्टर या फ़ार्मासिस्ट से पूछें। SameSalt खुराक की सलाह नहीं देता।',
    nti: 'यह दवा खुद से न बदलें। इसकी खुराक बिल्कुल सटीक होनी चाहिए और ब्रांड बदलना असुरक्षित हो सकता है। अपने डॉक्टर से बात करें।',
    notFound: 'यह दवा नहीं मिली। पट्टी पर जैसा छपा है, वैसा ही नाम लिखें।',
    visionFallback: 'फ़ोटो इसी फ़ोन पर पढ़ी जा रही है…',
    switchQ: 'क्या आपने सस्ता विकल्प ख़रीदा?',
    switchYes: 'हाँ, बदल लिया',
    switchAsk: 'डॉक्टर से पूछूँगा/पूछूँगी',
    switchNo: 'नहीं',
    thanks: 'धन्यवाद। इससे असली बचत मापने में मदद मिलती है।',
    pharmacistBtn: 'फ़ार्मासिस्ट को दिखाएँ',
    pharmacistCard: 'कृपया बिल्कुल इसी सॉल्ट और मात्रा वाली सबसे सस्ती दवा दें:',
    close: 'बंद करें',
    stepsTitle: 'SameSalt ने यह कैसे पता लगाया',
    privacy: 'हम फ़ोटो, नाम या फ़ोन नंबर नहीं रखते। बचत मापने के लिए सिर्फ़ बिना नाम की खोजें गिनते हैं।',
    impactLink: 'असर देखें',
    volunteer: 'स्वयंसेवक मोड',
    volunteerOn: 'स्वयंसेवक मोड चालू है: खोजों को स्वयंसेवक की मदद माना जाएगा।',
    dataNote: 'ब्रांड के दाम 2022 के डेटासेट से लिए गए छपे हुए MRP हैं और अब बदल चुके हो सकते हैं। जन औषधि के दाम आधिकारिक PMBJP सूची ({date}) से हैं।',
    language: 'भाषा',
    listen: 'सुनें',
    another: 'दूसरी दवा जाँचें',
  },
};

export function t(lang, key, vars = {}) {
  const table = STRINGS[lang] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  if (typeof s !== 'string') return s;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function rupees(x, digits = 2) {
  if (x == null || !Number.isFinite(+x)) return '—';
  const v = +x;
  return '₹' + (v >= 100 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(v < 10 ? digits : 1).replace(/\.0+$/, ''));
}

export function unitKind(form) {
  if (form === 'tablet' || form === 'chewable' || form === 'effervescent') return 'tablet';
  if (form === 'capsule') return 'capsule';
  if (form === 'liquid' || form === 'dry_syrup' || form === 'drops') return 'ml';
  return 'unit';
}

/**
 * The agent's final answer, composed from verified facts only (no free-form generation),
 * so every number and every safety line is the same in all three languages.
 * facts: { brand, composition, count, cheapBrand, cheapUnit, yourUnit, jaName, jaUnit, saving, pack, form, nti }
 */
export function composeAnswer(lang, f) {
  const unit = unitKind(f.form);
  const per = t(lang, 'perUnit')[unit];
  const L = [];
  if (lang === 'kn') {
    L.push(`${f.brand} ನಲ್ಲಿ ${f.composition} ಇದೆ.`);
    if (f.nti) { L.push(t('kn', 'nti')); return L.join(' '); }
    if (f.count > 1) L.push(`ಅದೇ ಸಾಲ್ಟ್ ಮತ್ತು ಅದೇ ಪ್ರಮಾಣದ ${f.count} ಬ್ರ್ಯಾಂಡ್‌ಗಳಿವೆ.`);
    if (f.cheapBrand && f.yourUnit != null) L.push(`ಅತಿ ಕಡಿಮೆ ಬೆಲೆ ${f.cheapBrand}: ${per} ${rupees(f.cheapUnit)}. ${f.brand}: ${per} ${rupees(f.yourUnit)}.`);
    else if (f.cheapBrand) L.push(`ಅತಿ ಕಡಿಮೆ ಬೆಲೆ ${f.cheapBrand}: ${per} ${rupees(f.cheapUnit)}.`);
    if (f.jaUnit != null) L.push(`ಜನ ಔಷಧಿ ಕೇಂದ್ರದಲ್ಲಿ ${f.jaName}: ${per} ${rupees(f.jaUnit)}.`);
    if (f.saving > 0) L.push(`ಒಂದು ಪ್ಯಾಕ್ (${f.pack}) ಮೇಲೆ ಸುಮಾರು ${rupees(f.saving)} ಉಳಿಸಬಹುದು.`);
    L.push('ಬದಲಾಯಿಸುವ ಮೊದಲು ನಿಮ್ಮ ವೈದ್ಯರು ಅಥವಾ ಫಾರ್ಮಸಿಸ್ಟ್ ಅವರನ್ನು ಕೇಳಿ.');
  } else if (lang === 'hi') {
    L.push(`${f.brand} में ${f.composition} है।`);
    if (f.nti) { L.push(t('hi', 'nti')); return L.join(' '); }
    if (f.count > 1) L.push(`बिल्कुल वही सॉल्ट और वही मात्रा वाले ${f.count} ब्रांड हैं।`);
    if (f.cheapBrand && f.yourUnit != null) L.push(`सबसे कम दाम ${f.cheapBrand} का है: ${per} ${rupees(f.cheapUnit)}, जबकि ${f.brand} ${per} ${rupees(f.yourUnit)} की है।`);
    else if (f.cheapBrand) L.push(`सबसे कम दाम ${f.cheapBrand} का है: ${per} ${rupees(f.cheapUnit)}।`);
    if (f.jaUnit != null) L.push(`जन औषधि केंद्र पर ${f.jaName}: ${per} ${rupees(f.jaUnit)}।`);
    if (f.saving > 0) L.push(`एक पैक (${f.pack}) पर लगभग ${rupees(f.saving)} बच सकते हैं।`);
    L.push('दवा बदलने से पहले अपने डॉक्टर या फ़ार्मासिस्ट से पूछें।');
  } else {
    L.push(`${f.brand} contains ${f.composition}.`);
    if (f.nti) { L.push(t('en', 'nti')); return L.join(' '); }
    if (f.count > 1) L.push(`${f.count} brands have exactly the same salt and strength.`);
    if (f.cheapBrand && f.yourUnit != null) L.push(`The lowest-priced is ${f.cheapBrand} at ${rupees(f.cheapUnit)} ${per}, against ${rupees(f.yourUnit)} for ${f.brand}.`);
    else if (f.cheapBrand) L.push(`The lowest-priced is ${f.cheapBrand} at ${rupees(f.cheapUnit)} ${per}.`);
    if (f.jaUnit != null) L.push(`At a Jan Aushadhi Kendra, ${f.jaName} costs ${rupees(f.jaUnit)} ${per}.`);
    if (f.saving > 0) L.push(`That can save about ${rupees(f.saving)} on one pack of ${f.pack}.`);
    L.push('Please check with your doctor or pharmacist before switching.');
  }
  return L.join(' ');
}
