const ASCII_A = 65;
const ALPHABET_LENGTH = 26;

export function numericToLocationCode(sequenceNumber: number) {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber <= 0) {
    throw new Error(
      "Location code sequence numbers must be positive integers.",
    );
  }

  let current = sequenceNumber;
  let code = "";

  while (current > 0) {
    current -= 1;
    code = String.fromCharCode(ASCII_A + (current % ALPHABET_LENGTH)) + code;
    current = Math.floor(current / ALPHABET_LENGTH);
  }

  return code;
}

export function nextLocationCode(currentCode: string) {
  return numericToLocationCode(locationCodeToNumeric(currentCode) + 1);
}

export function locationCodeToNumeric(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(normalizedCode)) {
    throw new Error("Location codes must use uppercase letters A-Z only.");
  }

  let numericValue = 0;

  for (const character of normalizedCode) {
    numericValue =
      numericValue * ALPHABET_LENGTH + (character.charCodeAt(0) - ASCII_A + 1);
  }

  return numericValue;
}
