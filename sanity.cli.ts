import { defineCliConfig } from "sanity/cli";
import { sanityEnv } from "@/sanity/env";

export default defineCliConfig({
  api: {
    projectId: sanityEnv.projectId,
    dataset: sanityEnv.dataset,
  },
});

