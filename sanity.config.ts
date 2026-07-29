"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { sanityEnv } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";

export default defineConfig({
  name: "nexubis",
  title: "Nexubis",
  basePath: "/studio",
  projectId: sanityEnv.projectId,
  dataset: sanityEnv.dataset,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});

