import "server-only";

import parsePhoneNumber, {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js/max";

const names = new Intl.DisplayNames(["en"], { type: "region" });

export const phoneCountries = getCountries()
  .map((iso2) => ({
    iso2,
    name: names.of(iso2) ?? iso2,
    callingCode: `+${getCountryCallingCode(iso2)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

const countriesByCode = new Map(phoneCountries.map((country) => [country.iso2, country]));

export function normalizePhone(input: string, selected: string, existing: string | null) {
  const country = countriesByCode.get(selected as CountryCode);
  if (!country) return null;

  if (existing) {
    // Preserve legacy numbers exactly. Only accept a compatible country for that number.
    const known = parsePhoneNumber(existing, { extract: false });
    if (!existing.startsWith(country.callingCode)) return null;
    if (known && `+${known.countryCallingCode}` !== country.callingCode) return null;
    if (known?.isValid() && !(known.country === country.iso2 ||
        (!known.country && known.getPossibleCountries().includes(country.iso2)))) return null;
    return { ...country, number: existing };
  }

  if (input.length > 32 || !/^\+?[0-9() .-]+$/.test(input)) return null;
  const phone = parsePhoneNumber(input, { defaultCountry: country.iso2, extract: false });
  if (!phone?.isValid() || `+${phone.countryCallingCode}` !== country.callingCode ||
      !(phone.country === country.iso2 ||
        (!phone.country && phone.getPossibleCountries().includes(country.iso2)))) return null;
  return { ...country, number: phone.number };
}
