import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminUsagePage() {
  return (
    <ComingSoon
      title="Usage Analytics"
      description="Per-workspace usage metrics — documents, API calls, and storage."
      issue="https://github.com/jimseiwert/context-stream/issues/27"
    />
  );
}
