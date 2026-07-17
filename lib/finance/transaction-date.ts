const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidTransactionDateInput(value: string) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function dateInputToTransactionTimestamp(value: string) {
  const dateInput = value.trim() || toDateInputValue(new Date());
  if (!isValidTransactionDateInput(dateInput)) {
    return null;
  }

  return `${dateInput}T12:00:00.000`;
}

export function transactionTimestampToDateInput(value: string) {
  return toDateInputValue(new Date(value));
}
