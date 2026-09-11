export function formatPatientName(patient: {
  firstName: string;
  lastName: string;
}): string {
  return `${patient.lastName}, ${patient.firstName}`;
}

export function formatPhone(phone: string | null | undefined): string | null | undefined {
  if (phone == null) return phone;
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
