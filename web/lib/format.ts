const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function dateValue(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  }

  return new Date(value);
}

export function formatDate(value: string | Date, timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(dateValue(value));
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

export function formatDecimalHours(value: number): string {
  return `${formatNumber(value, 2)} h`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "Indisponivel" : `${formatNumber(value * 100, 1)}%`;
}
