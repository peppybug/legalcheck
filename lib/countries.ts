// ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames so they stay correct.
const CODES = `AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW`.split(" ");

const names = new Intl.DisplayNames(["en"], { type: "region" });

export type Country = { code: string; name: string; flag: string };

function flag(code: string) {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export const COUNTRIES: Country[] = CODES.map((code) => ({
  code,
  name: code === "XK" ? "Kosovo" : names.of(code) ?? code,
  flag: flag(code),
})).sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRY_CODES = new Set(CODES);

export function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
