export function isDateInPast(dateString: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateString <= today;
}

export function toUTCDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00Z");
}

export function formatPatientName(patient: {
  firstName: string;
  lastName: string;
}): string {
  return `${patient.lastName}, ${patient.firstName}`;
}
