import Decimal from "../vendor/break_infinity.js";

export { Decimal };

export function D(value = 0) {
  return value instanceof Decimal ? value : new Decimal(value ?? 0);
}

export function serializeDecimal(value) {
  return D(value).toString();
}

export function formatDecimal(value, places = 2) {
  const decimal = D(value);
  if (!Number.isFinite(decimal.mantissa) || !Number.isFinite(decimal.exponent)) {
    return decimal.mantissa < 0 ? "-Infinity" : "Infinity";
  }
  if (decimal.eq(0)) return "0";

  const abs = decimal.abs();
  if (abs.lt(1000)) {
    const number = decimal.toNumber();
    return number.toFixed(places).replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  const exponent = decimal.exponent;
  if (exponent < 6) {
    return decimal.toNumber().toLocaleString("ko-KR", { maximumFractionDigits: places });
  }

  return `${decimal.mantissa.toFixed(places).replace(/\.00$/, "")}e${exponent.toLocaleString("en-US")}`;
}
