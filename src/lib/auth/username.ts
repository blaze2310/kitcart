export const USERNAME_PATTERN = "[A-Za-z][A-Za-z0-9_.]{0,49}";
export const USERNAME_MESSAGE = "Use 1–50 characters. Start with a letter and use only letters, numbers, underscores, or dots.";
const usernameRegex = new RegExp(`^${USERNAME_PATTERN}$`);
export function isValidUsername(value: string) {
  return usernameRegex.test(value) && !/[\r\n]/.test(value);
}
