const WORD_ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const WORD_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

function wordsToDigits(part) {
  const tokens = part.trim().split(/\s+/).filter(Boolean);
  let out = "";
  let i = 0;
  while (i < tokens.length) {
    const raw = tokens[i];
    const t = raw.replace(/[^a-z]/g, "");
    if (/^\d+$/.test(raw)) {
      out += raw;
      i++;
      continue;
    }
    if (WORD_TENS[t] !== undefined) {
      let val = WORD_TENS[t];
      const next = tokens[i + 1] ? tokens[i + 1].replace(/[^a-z]/g, "") : "";
      if (WORD_ONES[next] !== undefined && WORD_ONES[next] < 10) {
        val += WORD_ONES[next];
        i++;
      }
      out += String(val);
      i++;
      continue;
    }
    if (WORD_ONES[t] !== undefined) {
      out += String(WORD_ONES[t]);
      i++;
      continue;
    }
    i++; // skip filler words (e.g. "and")
  }
  return out;
}

// Parses spoken text like "minus two point five" or "plus 1.5" into a normalized numeric string.
function parseSpokenNumber(text) {
  let str = (text || "").toLowerCase().trim();
  let sign = "";
  // speech recognition sometimes returns a literal "-2.00" instead of the word "minus"
  if (/^-\s*/.test(str)) {
    sign = "-";
    str = str.replace(/^-\s*/, "");
  } else if (/^\+\s*/.test(str)) {
    sign = "+";
    str = str.replace(/^\+\s*/, "");
  }
  if (/^(plus|positive)\b/.test(str)) {
    sign = "+";
    str = str.replace(/^(plus|positive)\s*/, "");
  } else if (/^(minus|negative)\b/.test(str)) {
    sign = "-";
    str = str.replace(/^(minus|negative)\s*/, "");
  }
  str = str.replace(/\bpoint\b|\bdot\b/g, ".");
  const parts = str.split(".");
  const intPart = wordsToDigits(parts[0] || "");
  const decPart = parts.length > 1 ? wordsToDigits(parts[1]) : "";
  if (!intPart && !decPart) return sign + str.replace(/[^0-9.]/g, ""); // fallback: strip anything non-numeric
  let numStr = intPart || "0";
  if (decPart) numStr += "." + decPart;
  return sign + numStr;
}

// Sphere/cylinder/lens power: always signed, two decimal places (e.g. "+1.00", "-2.50").
export function parseRxPower(text) {
  const parsed = parseSpokenNumber(text);
  const m = parsed.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!m) return text;
  const sign = m[1] || "+";
  const intPart = m[2];
  const decPart = (m[3] || "").padEnd(2, "0").slice(0, 2);
  return `${sign}${intPart}.${decPart}`;
}

// Axis: plain integer 0-180, no sign or decimal.
export function parseRxAxis(text) {
  const parsed = parseSpokenNumber(text);
  const digits = parsed.replace(/[^\d]/g, "");
  if (!digits) return text;
  let n = parseInt(digits, 10);
  if (n > 180) n = 180;
  return String(n);
}

// PD (pupillary distance): plain positive number, no sign.
export function parseRxPlainNumber(text) {
  const parsed = parseSpokenNumber(text);
  const digits = parsed.replace(/[^\d.]/g, "");
  return digits || text;
}

// ADD power (near-vision addition): always positive, two decimal places.
export function parseRxAdd(text) {
  const parsed = parseSpokenNumber(text);
  const m = parsed.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!m) return text;
  const intPart = m[2];
  const decPart = (m[3] || "").padEnd(2, "0").slice(0, 2);
  return `+${intPart}.${decPart}`;
}
