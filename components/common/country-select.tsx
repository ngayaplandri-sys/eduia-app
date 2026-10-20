"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import {
  AFRICAN_COUNTRY_CODES,
  OTHER_COUNTRY,
  OTHER_COUNTRY_CODES,
  countryName,
  sortCountryCodes,
} from "@/lib/config/countries";
import { useI18n } from "@/lib/i18n/client";

/**
 * Liste déroulante « Dans quel pays étudies-tu ? » : les 54 pays d'Afrique
 * d'abord, puis les pays de la diaspora, puis « Autre pays ». Noms traduits
 * par le navigateur (`Intl.DisplayNames`), triés dans la langue de l'app.
 */
export function CountrySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const { dict, locale } = useI18n();
  const t = dict.country;
  const labels = { unknown: t.unknown, other: t.other };
  const african = React.useMemo(() => sortCountryCodes(AFRICAN_COUNTRY_CODES, locale), [locale]);
  const others = React.useMemo(() => sortCountryCodes(OTHER_COUNTRY_CODES, locale), [locale]);

  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      required
    >
      <option value="" disabled>
        {t.placeholder}
      </option>
      <optgroup label={t.groupAfrica}>
        {african.map((code) => (
          <option key={code} value={code}>
            {countryName(code, locale, labels)}
          </option>
        ))}
      </optgroup>
      <optgroup label={t.groupOther}>
        {others.map((code) => (
          <option key={code} value={code}>
            {countryName(code, locale, labels)}
          </option>
        ))}
        <option value={OTHER_COUNTRY}>{t.other}</option>
      </optgroup>
    </Select>
  );
}
