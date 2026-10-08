// Only public web addresses may be recorded. Rejects localhost, private and
// link-local IP ranges, non-public hostnames, and names that resolve to them,
// so the render machine can never be pointed at an internal service.
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UrlSafetyError extends Error {
  code: "invalid" | "not-public" | "not-found";
  constructor(message: string, code: "invalid" | "not-public" | "not-found") {
    super(message);
    this.code = code;
  }
}

type Lookup = (host: string) => Promise<{ address: string }[]>;

const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true });

// [network, prefix length]
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const BLOCKED_TLDS = new Set([
  "localhost", "local", "internal", "intranet", "lan", "home", "corp", "private",
  "test", "invalid", "example", "onion", "arpa",
]);

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, p) => n * 256 + Number(p), 0);
}

function isBlockedV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return BLOCKED_V4.some(([net, bits]) => {
    const size = 2 ** (32 - bits);
    const start = v4ToInt(net);
    return n >= start && n < start + size;
  });
}

// Expand an IPv6 address into 16 bytes (handles :: and a trailing dotted v4).
function v6ToBytes(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  const dotted = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const b = dotted[1].split(".").map(Number);
    s = s.slice(0, -dotted[1].length) +
      ((b[0] << 8) | b[1]).toString(16) + ":" + ((b[2] << 8) | b[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const g of groups) {
    const v = parseInt(g || "0", 16);
    if (Number.isNaN(v) || v > 0xffff) return null;
    bytes.push(v >> 8, v & 0xff);
  }
  return bytes.length === 16 ? bytes : null;
}

function isBlockedV6(ip: string): boolean {
  const b = v6ToBytes(ip);
  if (!b) return true; // unparseable: refuse
  const allZero = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  if (allZero(0, 15) && (b[15] === 0 || b[15] === 1)) return true; // :: and ::1
  if (allZero(0, 10) && b[10] === 0xff && b[11] === 0xff) return isBlockedV4(b.slice(12).join(".")); // ::ffff:a.b.c.d
  if (b[0] === 0 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && allZero(4, 12)) {
    return isBlockedV4(b.slice(12).join(".")); // 64:ff9b::/96 (NAT64)
  }
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedV4(b.slice(2, 6).join(".")); // 6to4
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // docs
  if (b[0] === 0x01 && allZero(1, 8)) return true; // 100::/64 discard
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true;
}

const NOT_PUBLIC =
  "That link points to a private or internal address. Paste the public link to your live site.";

/**
 * Parse `raw` and make sure it is a public http(s) address. Returns the parsed
 * URL. Throws UrlSafetyError with a message that is safe to show to the user.
 * `lookup` is injectable for tests.
 */
export async function assertPublicUrl(raw: string, lookup: Lookup = defaultLookup): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new UrlSafetyError("Enter a valid link starting with http:// or https://.", "invalid");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new UrlSafetyError("Only http:// and https:// links work.", "invalid");
  }
  if (u.username || u.password) {
    throw new UrlSafetyError("Remove the username/password from the link and paste the plain address.", "invalid");
  }

  let host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new UrlSafetyError(NOT_PUBLIC, "not-public");
    return u;
  }

  // A public name has a dot and a real top-level domain (letters, or punycode).
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || BLOCKED_TLDS.has(tld) || !/^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(tld)) {
    throw new UrlSafetyError(NOT_PUBLIC, "not-public");
  }

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host);
  } catch {
    throw new UrlSafetyError(
      "We couldn't find that site. Check the link, or paste the exact address of your live site.",
      "not-found",
    );
  }
  if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) {
    throw new UrlSafetyError(NOT_PUBLIC, "not-public");
  }
  return u;
}
