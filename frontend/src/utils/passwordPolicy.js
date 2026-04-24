export const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter (A-Z)" },
  { key: "number", label: "One number (0-9)" },
  { key: "symbol", label: "One special symbol (@, $, !, %, etc.)" },
];

export const PASSWORD_POLICY_MESSAGE =
  "New password must be at least 8 characters long and include an uppercase letter, a number, and a special character.";

export const getPasswordRequirements = (password = "") => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
  symbol: /[@$!%*?&#^()_\-+=]/.test(password),
});

export const isStrongPassword = (password) => STRONG_PASSWORD_REGEX.test(password);