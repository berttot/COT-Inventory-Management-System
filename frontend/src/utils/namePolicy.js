export const NAME_POLICY_MESSAGE = "Full name must contain letters only.";

export const isValidFullName = (name) => {
  if (typeof name !== "string") return false;

  const trimmed = name.trim();
  return /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmed);
};

export const sanitizeFullNameInput = (name) => {
  if (typeof name !== "string") return "";
  return name.replace(/[^A-Za-z\s]/g, "");
};