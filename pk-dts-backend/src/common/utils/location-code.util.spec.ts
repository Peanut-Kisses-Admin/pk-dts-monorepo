import {
  locationCodeToNumeric,
  nextLocationCode,
  numericToLocationCode,
} from "./location-code.util";

describe("location-code.util", () => {
  it.each([
    [1, "A"],
    [2, "B"],
    [25, "Y"],
    [26, "Z"],
    [27, "AA"],
    [28, "AB"],
    [51, "AY"],
    [52, "AZ"],
    [53, "BA"],
    [78, "BZ"],
    [79, "CA"],
    [701, "ZY"],
    [702, "ZZ"],
    [703, "AAA"],
    [704, "AAB"],
  ])("maps sequence %s to location code %s", (numericValue, code) => {
    expect(numericToLocationCode(numericValue)).toBe(code);
    expect(locationCodeToNumeric(code)).toBe(numericValue);
  });

  it.each([
    ["A", "B"],
    ["Y", "Z"],
    ["Z", "AA"],
    ["AA", "AB"],
    ["AY", "AZ"],
    ["AZ", "BA"],
    ["BY", "BZ"],
    ["BZ", "CA"],
    ["ZY", "ZZ"],
    ["ZZ", "AAA"],
    ["AAA", "AAB"],
  ])("moves %s to %s", (currentCode, nextCode) => {
    expect(nextLocationCode(currentCode)).toBe(nextCode);
  });

  it("rejects invalid codes", () => {
    expect(() => locationCodeToNumeric("A1")).toThrow(
      "Location codes must use uppercase letters A-Z only.",
    );
  });
});
