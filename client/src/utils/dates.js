/** Date helpers for <input type="datetime-local"> (local time, no seconds). */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** datetime-local string -> ISO string the API expects ('' stays ''). */
export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : '';
}

export function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
}
