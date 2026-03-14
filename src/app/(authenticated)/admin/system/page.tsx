import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminSystemPage() {
  return (
    <ComingSoon
      title="System"
      description="Configure embedding providers, vector stores, and feature flags."
      issue="https://github.com/jimseiwert/context-stream/issues/27"
    />
  );
}
