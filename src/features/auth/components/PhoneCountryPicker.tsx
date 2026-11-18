"use client";

import { useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

export type PhoneCountry = { iso2: string; name: string; callingCode: string };

export default function PhoneCountryPicker({
  countries, value, onChange, displayedCode, locked,
}: {
  countries: PhoneCountry[];
  value: string;
  onChange: (value: string) => void;
  displayedCode: string;
  locked: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const selected = countries.find(({ iso2 }) => iso2 === value);
  const search = query.trim().toLowerCase();
  const matches = countries.filter(({ name, callingCode, iso2 }) =>
    `${name} ${callingCode} ${iso2}`.toLowerCase().includes(search),
  );

  return (
    <div className="kc-phone-prefix">
      <input type="hidden" name="phoneCountry" value={value} />
      <button
        id="profile-phone-country" ref={trigger} type="button"
        className="kc-phone-prefix-button"
        aria-label={selected ? `Country calling code: ${selected.name} (${selected.callingCode})` : displayedCode ? `Choose country for calling code ${displayedCode}` : "Choose country calling code"}
        aria-haspopup="dialog" aria-controls="profile-phone-country-dialog"
        disabled={locked}
        onClick={() => {
          setQuery("");
          dialog.current?.showModal();
          searchField.current?.focus({ preventScroll: true });
        }}
      >
        <span>{displayedCode || "Code"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog} id="profile-phone-country-dialog"
        className="kc-glass kc-dob-dialog kc-phone-country-dialog"
        aria-labelledby="profile-phone-country-title"
        onClose={() => trigger.current?.focus({ preventScroll: true })}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      >
        <div className="kc-dob-panel">
          <div className="kc-dob-header">
            <h2 id="profile-phone-country-title">Country calling code</h2>
            <button className="kc-dob-icon" type="button" aria-label="Close country picker"
              onClick={() => dialog.current?.close()}><X size={18} aria-hidden="true" /></button>
          </div>
          <input
            ref={searchField} className="kc-input" type="search" aria-label="Search countries or calling codes"
            placeholder="Search by country or calling code"
            value={query} onChange={(event) => setQuery(event.target.value)}
          />
          <div className="kc-phone-country-list">
            {matches.map((country) => (
              <button
                className="kc-phone-country-option" key={country.iso2}
                type="button" aria-pressed={value === country.iso2}
                onClick={() => { onChange(country.iso2); dialog.current?.close(); }}
              >
                <span>{country.name}</span><span>{country.callingCode}</span>
              </button>
            ))}
            {!matches.length && <p role="status">No matching countries.</p>}
          </div>
        </div>
      </dialog>
    </div>
  );
}
