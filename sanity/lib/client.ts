import { createClient } from "next-sanity";
import { sanityEnv } from "@/sanity/env";

export const sanityClient = createClient({
  projectId: sanityEnv.projectId,
  dataset: sanityEnv.dataset,
  apiVersion: sanityEnv.apiVersion,
  useCdn: true,
});

