import "server-only";

import argon2 from "argon2";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 15;

const passwordPattern =
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,15}$/u;

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
} as const;

export function isValidPassword(password: string): boolean {
  return (
    typeof password === "string" &&
    passwordPattern.test(password)
  );
}

export function validatePassword(password: string): void {
  if (!isValidPassword(password)) {
    throw new Error(
      "Password must be 8-15 characters and contain " +
      "at least one uppercase letter, one number, " +
      "and one special character."
    );
  }
}

export async function hashPassword(
  password: string
): Promise<string> {
  validatePassword(password);

  return argon2.hash(password, hashOptions);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string" ||
    !storedHash.startsWith("$argon2id$")
  ) {
    return false;
  }

  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}
