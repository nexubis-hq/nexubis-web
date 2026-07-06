import type { Metadata } from "next";
import { PackagesPricing, PackagesServices } from "@/components/PackagesPricing";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Nexubis - Packages",
  description: "Explore flexible, all-in-one creative packages with a flat monthly fee.",
};

export default function PackagesPage() {
  return <><SiteHeader activePage="packages" /><main><PackagesPricing /><PackagesServices /></main></>;
}
