import { Logo } from "@/components/logo";
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t py-12 mt-auto">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <Logo size={28} animated={false} />
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="https://github.com/jimseiwert/context-stream"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
