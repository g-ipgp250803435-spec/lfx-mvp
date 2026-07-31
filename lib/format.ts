export const money = (value: number) => new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" }).format(value || 0);

export function formatDate(value: string, locale = "ms-MY") {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
