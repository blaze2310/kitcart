"use client";

import { USERNAME_PATTERN } from "@/lib/auth/username";
import { useActionState, useState } from "react";
import BirthDatePicker from "@/features/auth/components/BirthDatePicker";
import PhoneCountryPicker, { type PhoneCountry } from "@/features/auth/components/PhoneCountryPicker";

export type ProfileFields = {
  username: string;
  phone: string;
  phoneCountry: string;
  dateOfBirth: string;
};

export type FormState = { error: string; values: ProfileFields };

export default function ProfileForm({
  save, initial, countries,
}: {
  save: (state: FormState, data: FormData) => Promise<FormState>;
  initial: ProfileFields;
  countries: PhoneCountry[];
}) {
  const [state, action, pending] = useActionState(save, { error: "", values: initial });
  const [country, setCountry] = useState(initial.phoneCountry);
  const [dob, setDob] = useState(initial.dateOfBirth);
  const selectedCode = countries.find(({ iso2 }) => iso2 === country)?.callingCode;
  const savedCode = initial.phone
    ? countries.reduce((prefix, { callingCode }) =>
        callingCode.length > prefix.length && initial.phone.startsWith(callingCode)
          ? callingCode : prefix, "")
    : "";
  const visibleCode = selectedCode ?? savedCode;
  const selectableCountries = savedCode
    ? countries.filter(({ callingCode }) => callingCode === savedCode)
    : countries;
  const savedPhoneDisplay = savedCode ? initial.phone.slice(savedCode.length) : initial.phone;

  return (
    <form action={action} className="kc-form mb-4 text-left">
      <div>
        <label className="kc-field-label" htmlFor="profile-username">Username</label>
        <input
          id="profile-username" name="username" className="kc-input"
          autoComplete="username" maxLength={50} required
          pattern={USERNAME_PATTERN} defaultValue={state.values.username}
          readOnly={Boolean(initial.username)}
        />
      </div>
      <div>
        <label className="kc-field-label" htmlFor="profile-phone">Phone number</label>
        <div className="kc-input kc-phone-row">
          <PhoneCountryPicker countries={selectableCountries} value={country} onChange={setCountry}
            displayedCode={visibleCode} locked={Boolean(initial.phoneCountry)} />
          <input
            id="profile-phone" name="phone" type="tel" className="kc-phone-number"
            autoComplete="tel-national" placeholder="Phone number" maxLength={32}
            value={initial.phone ? savedPhoneDisplay : undefined}
            defaultValue={initial.phone ? undefined : state.values.phone}
            required readOnly={Boolean(initial.phone)}
          />
        </div>
        {initial.phone && !initial.phoneCountry && (
          <small>Choose the country for your saved number. The number won’t change.</small>
        )}
      </div>
      {initial.dateOfBirth ? (
        <div>
          <label className="kc-field-label" htmlFor="profile-dob">Date of birth</label>
          <input id="profile-dob" className="kc-input" type="date"
            name="dateOfBirth" value={initial.dateOfBirth} readOnly />
        </div>
      ) : (
        <BirthDatePicker value={dob} onChange={setDob} invalid={Boolean(state.error && !dob)} />
      )}
      {state.error && <p className="kc-feedback" role="alert">{state.error}</p>}
      <button className="kc-primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
