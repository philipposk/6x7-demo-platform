import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPublicUrl, isBlockedIp, UrlSafetyError } from "./url-safety.ts";

const publicDns = async () => [{ address: "93.184.216.34" }];

async function rejects(url: string, code: string, lookup = publicDns) {
  await assert.rejects(assertPublicUrl(url, lookup), (e: unknown) => {
    assert.ok(e instanceof UrlSafetyError, `expected UrlSafetyError for ${url}`);
    assert.equal(e.code, code, `${url}: ${e.message}`);
    return true;
  });
}

test("accepts a normal public site", async () => {
  const u = await assertPublicUrl("https://example.com/app?x=1", publicDns);
  assert.equal(u.href, "https://example.com/app?x=1");
});

test("rejects non-http(s) and garbage", async () => {
  await rejects("ftp://example.com", "invalid");
  await rejects("file:///etc/passwd", "invalid");
  await rejects("javascript:alert(1)", "invalid");
  await rejects("not a url", "invalid");
});

test("rejects credentials in the link", async () => {
  await rejects("https://user:pw@example.com", "invalid");
});

test("rejects localhost and non-public names", async () => {
  for (const u of [
    "http://localhost:3000", "http://app.localhost", "http://intranet", "http://printer.local",
    "http://db.internal", "http://foo.test", "http://example", "http://x.corp",
  ]) await rejects(u, "not-public");
});

test("rejects private, loopback and link-local IPv4 (including odd spellings)", async () => {
  for (const u of [
    "http://127.0.0.1", "http://10.0.0.5", "http://172.16.0.1", "http://172.31.255.255",
    "http://192.168.1.1", "http://169.254.169.254/latest/meta-data", "http://0.0.0.0",
    "http://100.64.0.1", "http://2130706433", "http://0x7f.1", "http://017700000001",
    "http://224.0.0.1", "http://255.255.255.255",
  ]) await rejects(u, "not-public");
});

test("allows public IPv4 literals", async () => {
  await assertPublicUrl("http://93.184.216.34/", publicDns);
  await assertPublicUrl("http://172.32.0.1/", publicDns); // just outside 172.16/12
});

test("rejects private IPv6, including IPv4-mapped", async () => {
  for (const u of [
    "http://[::1]/", "http://[::]/", "http://[fc00::1]/", "http://[fd12:3456::1]/",
    "http://[fe80::1]/", "http://[::ffff:127.0.0.1]/", "http://[::ffff:10.0.0.1]/",
    "http://[64:ff9b::7f00:1]/", "http://[2002:7f00:1::]/", "http://[ff02::1]/",
  ]) await rejects(u, "not-public");
});

test("allows public IPv6", async () => {
  await assertPublicUrl("http://[2606:4700:4700::1111]/", publicDns);
  await assertPublicUrl("http://[::ffff:93.184.216.34]/", publicDns);
});

test("rejects a name that resolves to a private address (any of several)", async () => {
  await rejects("https://sneaky.example.com", "not-public", async () => [{ address: "10.1.2.3" }]);
  await rejects("https://sneaky.example.com", "not-public", async () => [
    { address: "93.184.216.34" }, { address: "127.0.0.1" },
  ]);
  await rejects("https://sneaky.example.com", "not-public", async () => [{ address: "::1" }]);
});

test("friendly error when the domain does not exist", async () => {
  await rejects("https://no-such-site-xyz.com", "not-found", async () => { throw new Error("ENOTFOUND"); });
});

test("isBlockedIp refuses things it cannot parse", () => {
  assert.equal(isBlockedIp("not-an-ip"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
});
