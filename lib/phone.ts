// lib/phone.ts

/**
 * Normalizes a Zimbabwean phone number to E.164 format.
 * - Removes leading/trailing whitespace.
 * - Replaces a leading "0" with "+263".
 * - Ensures the number starts with "+263".
 *
 * @param phoneNumber The phone number to normalize.
 * @returns The normalized phone number in E.164 format, or null if the input is invalid.
 *
 * @example
 * normalizeZimbabweanPhoneNumber('0787550853') // returns '+263787550853'
 * normalizeZimbabweanPhoneNumber('787550853')  // returns '+263787550853'
 * normalizeZimbabweanPhoneNumber('+263787550853') // returns '+263787550853'
 * normalizeZimbabweanPhoneNumber('12345') // returns null
 */
export function normalizeZimbabweanPhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  const sanitized = phoneNumber.replace(/\s+/g, '').trim();

  if (sanitized.startsWith('0')) {
    const withoutLeadingZero = sanitized.substring(1);
    if (withoutLeadingZero.length === 9 && /^\d+$/.test(withoutLeadingZero)) {
      return `+263${withoutLeadingZero}`;
    }
  }

  if (sanitized.startsWith('263')) {
      return `+${sanitized}`;
  }
  
  if (sanitized.length === 9 && /^\d+$/.test(sanitized)) {
    return `+263${sanitized}`;
  }

  if (sanitized.startsWith('+263')) {
    if (sanitized.length === 13 && /^\+\d+$/.test(sanitized)) {
      return sanitized;
    }
  }

  // Basic validation for common lengths, can be adjusted
  if (sanitized.length < 9 || sanitized.length > 13) {
    return null;
  }
  
  return null;
}
