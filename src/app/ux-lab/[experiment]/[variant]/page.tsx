import { notFound } from "next/navigation";
import { ExperimentRunner } from "@/components/ux-lab/runner";
import { experiments, variantName, type Experiment, type Variant } from "@/lib/ux-lab/fixtures";

type Params = { experiment: string; variant: string };
export function generateStaticParams() {
  return Object.entries(experiments).flatMap(([experiment, config]) => Object.keys(config.variants).map(variant => ({ experiment, variant })));
}
export default async function ExperimentPage({ params }: { params: Promise<Params> }) {
  const { experiment, variant } = await params;
  if (!Object.hasOwn(experiments, experiment) || !["a", "b", "c"].includes(variant) || !variantName(experiment as Experiment, variant as Variant)) notFound();
  return <ExperimentRunner experiment={experiment as Experiment} variant={variant as Variant} />;
}
