export function isDateInPast(dateString: string): boolean {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

export function formatPatientName(patient: {
  firstName: string;
  lastName: string;
}): string {
  return `${patient.lastName}, ${patient.firstName}`;
}
