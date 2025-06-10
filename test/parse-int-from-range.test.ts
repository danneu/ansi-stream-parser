import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { parseIntFromRange } from "../src/tokenizer.js";

describe("parseIntFromRange", () => {
  test("should parse positive integers", () => {
    assert.equal(parseIntFromRange("123", 0, 3), 123);
    assert.equal(parseIntFromRange("0", 0, 1), 0);
    assert.equal(parseIntFromRange("1", 0, 1), 1);
    assert.equal(parseIntFromRange("999", 0, 3), 999);
  });

  test("should parse negative integers", () => {
    assert.equal(parseIntFromRange("-123", 0, 4), -123);
    assert.equal(parseIntFromRange("-1", 0, 2), -1);
    assert.equal(parseIntFromRange("-0", 0, 2), 0);
    assert.equal(parseIntFromRange("-999", 0, 4), -999);
  });

  test("should parse integers from substrings", () => {
    assert.equal(parseIntFromRange("abc123def", 3, 6), 123);
    assert.equal(parseIntFromRange("start-456end", 5, 9), -456);
    assert.equal(parseIntFromRange("38;2;255;128;0", 5, 8), 255);
    assert.equal(parseIntFromRange("38;2;255;128;0", 9, 12), 128);
    assert.equal(parseIntFromRange("38;2;255;128;0", 13, 14), 0);
  });

  test("should handle large numbers", () => {
    assert.equal(parseIntFromRange("999999999", 0, 9), 999999999);
    assert.equal(parseIntFromRange("-999999999", 0, 10), -999999999);
    
    // Very large number that might overflow
    const largeNum = "999999999999999999999";
    const result = parseIntFromRange(largeNum, 0, largeNum.length);
    assert.equal(typeof result, "number");
    assert.ok(result !== null);
    assert.ok(result > 1e20);
  });

  test("should return null for empty ranges", () => {
    assert.equal(parseIntFromRange("123", 0, 0), null);
    assert.equal(parseIntFromRange("123", 1, 1), null);
    assert.equal(parseIntFromRange("123", 5, 5), null);
    assert.equal(parseIntFromRange("", 0, 0), null);
  });

  test("should return null for invalid ranges", () => {
    assert.equal(parseIntFromRange("123", 2, 1), null); // start > end
    assert.equal(parseIntFromRange("123", 3, 2), null); // start > end
    assert.equal(parseIntFromRange("123", -1, 3), null); // negative start (would be >= end after comparison)
  });

  test("should return null for non-numeric content", () => {
    assert.equal(parseIntFromRange("abc", 0, 3), null);
    assert.equal(parseIntFromRange("red", 0, 3), null);
    assert.equal(parseIntFromRange("1a3", 0, 3), null); // mixed content
    assert.equal(parseIntFromRange("a23", 0, 3), null); // starts with letter
    assert.equal(parseIntFromRange("12a", 0, 3), null); // ends with letter
  });

  test("should return null for just a minus sign", () => {
    assert.equal(parseIntFromRange("-", 0, 1), null);
    assert.equal(parseIntFromRange("prefix-suffix", 6, 7), null);
  });

  test("should return null for minus sign followed by non-digits", () => {
    assert.equal(parseIntFromRange("-abc", 0, 4), null);
    assert.equal(parseIntFromRange("-", 0, 1), null);
    assert.equal(parseIntFromRange("-;", 0, 2), null);
  });

  test("should handle leading zeros", () => {
    assert.equal(parseIntFromRange("000", 0, 3), 0);
    assert.equal(parseIntFromRange("001", 0, 3), 1);
    assert.equal(parseIntFromRange("0123", 0, 4), 123);
    assert.equal(parseIntFromRange("-000", 0, 4), 0);
    assert.equal(parseIntFromRange("-001", 0, 4), -1);
    assert.equal(parseIntFromRange("-0123", 0, 5), -123);
  });

  test("should handle boundary positions", () => {
    const str = "12345";
    
    // Parse each digit individually
    assert.equal(parseIntFromRange(str, 0, 1), 1);
    assert.equal(parseIntFromRange(str, 1, 2), 2);
    assert.equal(parseIntFromRange(str, 2, 3), 3);
    assert.equal(parseIntFromRange(str, 3, 4), 4);
    assert.equal(parseIntFromRange(str, 4, 5), 5);
    
    // Parse subranges
    assert.equal(parseIntFromRange(str, 0, 2), 12);
    assert.equal(parseIntFromRange(str, 1, 3), 23);
    assert.equal(parseIntFromRange(str, 2, 5), 345);
  });

  test("should handle positions at string boundaries", () => {
    const str = "123";
    
    // Valid boundary cases
    assert.equal(parseIntFromRange(str, 0, 3), 123);
    assert.equal(parseIntFromRange(str, 0, str.length), 123);
    
    // Invalid boundary cases
    assert.equal(parseIntFromRange(str, 0, 4), 123); // end beyond string length, but should still work
    assert.equal(parseIntFromRange(str, 3, 3), null); // start equals end
  });

  test("should handle special characters", () => {
    assert.equal(parseIntFromRange("1;2", 0, 1), 1);
    assert.equal(parseIntFromRange("1;2", 2, 3), 2);
    assert.equal(parseIntFromRange("1;", 0, 1), 1);
    assert.equal(parseIntFromRange(";2", 1, 2), 2);
    
    // Should fail on special characters within the range
    assert.equal(parseIntFromRange("1;2", 0, 3), null); // includes semicolon
    assert.equal(parseIntFromRange("1.5", 0, 3), null); // includes decimal point
    assert.equal(parseIntFromRange("1,000", 0, 5), null); // includes comma
  });

  test("should handle ANSI parameter parsing scenarios", () => {
    // Common ANSI scenarios
    const params = "38;2;255;128;0";
    
    assert.equal(parseIntFromRange(params, 0, 2), 38);   // "38"
    assert.equal(parseIntFromRange(params, 3, 4), 2);    // "2"
    assert.equal(parseIntFromRange(params, 5, 8), 255);  // "255"
    assert.equal(parseIntFromRange(params, 9, 12), 128); // "128"
    assert.equal(parseIntFromRange(params, 13, 14), 0);  // "0"
    
    // Empty parameters (common in malformed sequences)
    const emptyParams = "38;;255";
    assert.equal(parseIntFromRange(emptyParams, 0, 2), 38);   // "38"
    assert.equal(parseIntFromRange(emptyParams, 3, 3), null); // ""
    assert.equal(parseIntFromRange(emptyParams, 4, 7), 255);  // "255"
  });

  test("should handle edge cases with negative numbers in ANSI", () => {
    // Negative RGB values (technically invalid but parser should handle)
    const negativeRgb = "38;2;-1;128;255";
    
    assert.equal(parseIntFromRange(negativeRgb, 0, 2), 38);   // "38"
    assert.equal(parseIntFromRange(negativeRgb, 3, 4), 2);    // "2"
    assert.equal(parseIntFromRange(negativeRgb, 5, 7), -1);   // "-1"
    assert.equal(parseIntFromRange(negativeRgb, 8, 11), 128); // "128"
    assert.equal(parseIntFromRange(negativeRgb, 12, 15), 255); // "255"
  });

  test("should match behavior of parseInt for valid cases", () => {
    const testCases = [
      "0",
      "1",
      "123",
      "999",
      "-1",
      "-123",
      "000",
      "001",
      "0123"
    ];
    
    for (const testCase of testCases) {
      const expected = parseInt(testCase, 10);
      const actual = parseIntFromRange(testCase, 0, testCase.length);
      assert.equal(actual, expected, `Failed for input: ${testCase}`);
    }
  });

  test("should handle extreme positions", () => {
    const str = "12345";
    
    // Start beyond string length
    assert.equal(parseIntFromRange(str, 10, 15), null);
    
    // Both start and end beyond string length
    assert.equal(parseIntFromRange(str, 10, 20), null);
    
    // Negative positions (should be handled gracefully)
    assert.equal(parseIntFromRange(str, -1, 2), null);
  });
});