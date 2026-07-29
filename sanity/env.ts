const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

function requireSanityEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required Sanity environment variable: ${name}`);
  }

  return value;
}

export const sanityEnv = {
  projectId: requireSanityEnv(projectId, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
  dataset: requireSanityEnv(dataset, "NEXT_PUBLIC_SANITY_DATASET"),
  apiVersion: "2026-07-29",
};

