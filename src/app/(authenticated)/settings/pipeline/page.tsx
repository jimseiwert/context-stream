import { ComingSoon } from "@/components/layout/coming-soon";

export default function PipelineConfigPage() {
  return (
    <ComingSoon
      title="Pipeline Config"
      description="Configure chunking strategy, embedding provider, and re-index schedule."
      issue="https://github.com/jimseiwert/context-stream/issues/23"
    />
  );
}
