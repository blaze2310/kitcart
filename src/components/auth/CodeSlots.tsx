"use client";

import { motion, useReducedMotion } from "motion/react";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// Lightweight adaptation of React Bits' Code Slots interaction pattern.
// https://reactbits.dev/micro/code-slots
export default function CodeSlots({ length = 6, value, onChange, disabled = false }: Props) {
  const reducedMotion = useReducedMotion();
  const update = (next: string) => onChange(next.replace(/\D/g, "").slice(0, length));

  return (
    <div className="kc-otp-slots">
      <input
        className="kc-otp-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        pattern="[0-9]*"
        aria-label={`${length}-digit verification code`}
        disabled={disabled}
        value={value}
        onChange={(event) => update(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          update(event.clipboardData.getData("text"));
        }}
      />
      {Array.from({ length }, (_, index) => (
        <span
          key={index}
          className={`kc-otp-slot ${index === Math.min(value.length, length - 1) ? "kc-otp-active" : ""}`}
          aria-hidden="true"
        >
          {value[index] && (
            <motion.span
              key={`${index}-${value[index]}`}
              initial={reducedMotion ? false : { opacity: 0, y: -12, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.2 }}
            >
              {value[index]}
            </motion.span>
          )}
        </span>
      ))}
    </div>
  );
}
