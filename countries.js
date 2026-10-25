// Countries for profile flags: ISO 3166 codes, names, emoji flags, and a guess from the phone's settings.
(function () {
  'use strict';
  const CODES = ('AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
    'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ ' +
    'OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
    'UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ');
  const EXTRA = ['GB-ENG', 'GB-SCT', 'GB-WLS']; // England, Scotland, Wales flags
  let names = null;
  try { names = new Intl.DisplayNames(['en-GB'], { type: 'region' }); } catch (_) {}
  const nameOf = c => c === 'GB-ENG' ? 'England' : c === 'GB-SCT' ? 'Scotland' : c === 'GB-WLS' ? 'Wales' : c === 'XK' ? 'Kosovo' : (names ? names.of(c) : c) || c;
  const SUB = { 'GB-ENG': 'gbeng', 'GB-SCT': 'gbsct', 'GB-WLS': 'gbwls' };
  function flag(c) {
    if (!c) return '';
    if (SUB[c]) return '🏴' + [...SUB[c]].map(ch => String.fromCodePoint(0xE0000 + ch.charCodeAt(0))).join('') + String.fromCodePoint(0xE007F);
    if (!/^[A-Z]{2}$/.test(c)) return '';
    return String.fromCodePoint(...[...c].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
  }
  // Time zone tells us the most about where someone actually is.
  const TZ = {
    'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
    'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG', 'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA',
    'Europe/Moscow': 'RU', 'Europe/Belgrade': 'RS', 'Europe/Zagreb': 'HR', 'Europe/Vilnius': 'LT', 'Europe/Riga': 'LV', 'Europe/Tallinn': 'EE', 'Europe/Malta': 'MT', 'Europe/Luxembourg': 'LU',
    'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Tripoli': 'LY', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
    'Africa/Johannesburg': 'ZA', 'Africa/Addis_Ababa': 'ET', 'Africa/Dakar': 'SN', 'Africa/Abidjan': 'CI', 'Africa/Khartoum': 'SD',
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Baghdad': 'IQ',
    'Asia/Tehran': 'IR', 'Asia/Jerusalem': 'IL', 'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS', 'Asia/Damascus': 'SY', 'Asia/Karachi': 'PK', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD',
    'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK', 'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Tashkent': 'UZ', 'Asia/Almaty': 'KZ', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Montreal': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
    'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Caracas': 'VE', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ'
  };
  function guess() {
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ[tz]) return TZ[tz]; } catch (_) {}
    for (const l of navigator.languages || [navigator.language || '']) { const m = /-([A-Z]{2})$/i.exec(l); if (m && CODES.includes(m[1].toUpperCase())) return m[1].toUpperCase(); }
    return null;
  }
  const all = () => [...CODES, ...EXTRA].map(c => ({ code: c, name: nameOf(c) })).sort((a, b) => a.name.localeCompare(b.name));
  window.MHCountries = { flag, nameOf, guess, all, valid: c => CODES.includes(c) || EXTRA.includes(c) };
})();
