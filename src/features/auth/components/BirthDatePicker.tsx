"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const firstYear = 1900;
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function birthDateISO(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidBirthDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= `${firstYear}-01-01`
    && value <= birthDateISO(new Date())
    && birthDateISO(new Date(`${value}T12:00:00`)) === value;
}

export default function BirthDatePicker({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState({ year: 2000, month: 0 });
  const [maxDate, setMaxDate] = useState({ year: 2000, month: 0, day: 1 });

  function open() {
    const today = new Date();
    const chosen = value ? new Date(`${value}T12:00:00`) : today;
    setMaxDate({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
    setView({ year: chosen.getFullYear(), month: chosen.getMonth() });
    dialogRef.current?.showModal();
  }

  function setMonth(year: number, month: number) {
    setView({ year, month: year === maxDate.year ? Math.min(month, maxDate.month) : month });
  }

  function moveMonth(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    setMonth(next.getFullYear(), next.getMonth());
  }

  function close() {
    dialogRef.current?.close();
  }

  const first = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const days = new Date(view.year, view.month + 1, 0).getDate();
  const atLatestMonth = view.year === maxDate.year && view.month === maxDate.month;
  const formatted = value ? formatter.format(new Date(`${value}T12:00:00`)) : "";

  return (
    <div>
      <label className="kc-field-label" htmlFor="signup-dob">Date of birth</label>
      <button
        id="signup-dob"
        type="button"
        className="kc-input kc-dob-trigger"
        aria-haspopup="dialog"
        aria-controls="signup-dob-calendar"
        data-invalid={invalid || undefined}
        aria-describedby={invalid ? "signup-dob-error" : undefined}
        ref={triggerRef}
        onClick={open}
      >
        <span data-placeholder={!value || undefined}>{formatted || "Choose your date of birth"}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      <input type="hidden" name="dateOfBirth" value={value} />
      {invalid && <p className="kc-dob-error" id="signup-dob-error" role="alert">Choose a valid date of birth.</p>}

      <dialog
        ref={dialogRef}
        id="signup-dob-calendar"
        className="kc-glass kc-dob-dialog"
        aria-labelledby="signup-dob-title"
        onClose={() => triggerRef.current?.focus({ preventScroll: true })}
        onClick={event => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="kc-dob-panel">
          <div className="kc-dob-header">
            <div>
              <h2 id="signup-dob-title">Date of birth</h2>
              <p>Choose a year, month and day.</p>
            </div>
            <button className="kc-dob-icon" type="button" aria-label="Close calendar" onClick={close}><X size={18} /></button>
          </div>
          <div className="kc-dob-controls">
            <button className="kc-dob-icon" type="button" aria-label="Previous month" disabled={view.year === firstYear && view.month === 0} onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button>
            <select aria-label="Birth month" value={view.month} onChange={event => setMonth(view.year, Number(event.target.value))}>
              {months.map((name, month) => <option key={name} value={month} disabled={view.year === maxDate.year && month > maxDate.month}>{name}</option>)}
            </select>
            <select aria-label="Birth year" autoFocus value={view.year} onChange={event => setMonth(Number(event.target.value), view.month)}>
              {Array.from({ length: maxDate.year - firstYear + 1 }, (_, offset) => maxDate.year - offset).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button className="kc-dob-icon" type="button" aria-label="Next month" disabled={atLatestMonth} onClick={() => moveMonth(1)}><ChevronRight size={18} /></button>
          </div>
          <div className="kc-dob-grid">
            {weekdays.map(day => <abbr key={day} title={day} aria-hidden="true">{day.slice(0, 2)}</abbr>)}
            {Array.from({ length: first }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const date = new Date(view.year, view.month, day);
              const iso = birthDateISO(date);
              return (
                <button
                  className="kc-dob-day"
                  key={day}
                  type="button"
                  aria-label={formatter.format(date)}
                  aria-pressed={value === iso}
                  disabled={atLatestMonth && day > maxDate.day}
                  onClick={() => { onChange(iso); close(); }}
                >{day}</button>
              );
            })}
          </div>
        </div>
      </dialog>
    </div>
  );
}
