import { test } from "vitest";
import assert from "node:assert/strict";
import { getPackagesFaq } from "./packages-faq";
import { formatMoney, priceFor, tierById } from "./packages";

test("Packages FAQ pricing answer matches current package names, prices and billing-cycle wording", () => {
  const pricingAnswer = getPackagesFaq("EUR")[0]?.a ?? "";

  for (const id of ["momentum", "scale"] as const) {
    const tier = tierById(id);
    assert.match(pricingAnswer, new RegExp(`${tier.name} is ${formatMoney("EUR", tier.monthly.EUR)} / month`));
  }

  const partner = tierById("partner");
  assert.match(pricingAnswer, new RegExp(`Partner is ${formatMoney("EUR", partner.monthly.EUR)} / month on monthly billing`));
  assert.match(pricingAnswer, new RegExp(`or ${formatMoney("EUR", priceFor(partner, "EUR", "yearly"))} / month on yearly billing`));
  assert.match(pricingAnswer, /default view/);
  assert.equal(pricingAnswer.includes("Flex"), false);
});
