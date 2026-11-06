import type { DateOnly } from "./types";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function toDateOnly(value: string): DateOnly {
  if (!isDateOnly(value)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return value;
}

export function todayDateOnly(timezone = "America/Sao_Paulo"): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return toDateOnly(`${values.year}-${values.month}-${values.day}`);
}
