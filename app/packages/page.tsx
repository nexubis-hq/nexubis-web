import type { Metadata } from "next";
import { PackagesServices } from "@/components/PackagesPricing";
import { PackagesComparison } from "@/components/PackagesComparison";
import { PackagesTrial } from "@/components/PackagesTrial";
import { PricingSection } from "@/components/packages/PricingSection";
import { PackagesFaq } from "@/components/PackagesFaq";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { currencyFromParam } from "@/lib/packages";

export const metadata: Metadata = {
  title: "Nexubis - Packages",
  description: "One creative team on a flat monthly fee. Three levels, one invoice, no per-project quotes.",
  alternates: {
    canonical: "https://www.nexubis.io/packages",
  },
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.currency) ? sp.currency[0] : sp.currency;
  const currency = currencyFromParam(raw);

  return (
    <>
      <SiteHeader activePage="packages" />
      <main>
        <PricingSection currency={currency} />
        <PackagesServices />
        <PackagesComparison />
        <PackagesTrial />
        <PackagesFaq currency={currency} />
      </main>
      <SiteFooter />
    </>
  );
}
