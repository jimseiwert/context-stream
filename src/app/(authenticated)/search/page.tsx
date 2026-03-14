import { ComingSoon } from "@/components/layout/coming-soon";

export default function SearchPage() {
  return (
    <ComingSoon
      title="Search"
      description="Hybrid BM25 + vector search with reranking and query playground."
      issue="https://github.com/jimseiwert/context-stream/issues/25"
    />
  );
}
