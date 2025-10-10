export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Code2,
  Database,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ContextStream</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="container px-4 py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              Open Source MCP Server
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Make Any Documentation
              <span className="block text-primary mt-2">
                AI-Accessible in Minutes
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              ContextStream indexes websites and codebases, making them
              instantly searchable through Claude Desktop and other AI tools via
              the Model Context Protocol.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  href="https://github.com/contextstream/contextstream"
                  target="_blank"
                >
                  <Code2 className="mr-2 h-4 w-4" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              Built for AI-First Developers
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              ContextStream seamlessly integrates documentation into your AI
              workflow
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Instant Indexing</h3>
              <p className="mt-2 text-muted-foreground">
                Add any documentation site or GitHub repo. We'll scrape, chunk,
                and embed it for optimal AI retrieval.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">MCP Integration</h3>
              <p className="mt-2 text-muted-foreground">
                Works seamlessly with Claude Desktop and other MCP-compatible AI
                tools for context-aware assistance.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Hybrid Search</h3>
              <p className="mt-2 text-muted-foreground">
                Combines BM25 and semantic search for accurate results, whether
                you search via web or AI.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Global Sources</h3>
              <p className="mt-2 text-muted-foreground">
                Popular docs like React, Python, and Vue are pre-indexed. Add
                them instantly without waiting.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Secure & Private</h3>
              <p className="mt-2 text-muted-foreground">
                Your private documentation stays private. Role-based access
                ensures the right people see the right docs.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Open Source</h3>
              <p className="mt-2 text-muted-foreground">
                Self-host for complete control or use our cloud service. MIT
                licensed and community-driven.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">
              Ready to Enhance Your AI Workflow?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of developers using ContextStream to make
              documentation instantly accessible to AI.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">ContextStream</span>
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="https://github.com/contextstream/contextstream"
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
    </div>
  );
}
