import type { Metadata } from "next";
import { PackagesPricing, PackagesServices } from "@/components/PackagesPricing";
import { PackagesComparison } from "@/components/PackagesComparison";
import { PackagesTrial } from "@/components/PackagesTrial";
import { PackagesFaq } from "@/components/PackagesFaq";
import { PackagesCloudCta } from "@/components/PackagesCloudCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Nexubis - Packages",
  description: "Explore flexible, all-in-one creative packages with a flat monthly fee.",
};

export default function PackagesPage() {
  return <><SiteHeader activePage="packages" /><main><PackagesPricing /><PackagesServices /><PackagesComparison /><PackagesTrial /><PackagesFaq /></main><PackagesCloudCta /><SiteFooter /></>;
}
