/**
 * Documentation Page
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicFooter } from "@/components/layout/public-footer";
import { Book, Code2, GitBranch, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Documentation - ContextStream",
  description: "Learn how to use ContextStream to index and search documentation with AI",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">ContextStream</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
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

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Documentation</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to get started with ContextStream
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-12">
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>
                  Get up and running with ContextStream in minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Create an account</li>
                  <li>Add your first documentation source</li>
                  <li>Configure the MCP server in Claude Desktop</li>
                  <li>Start asking questions about your docs!</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Code2 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>MCP Integration</CardTitle>
                <CardDescription>
                  Connect ContextStream to Claude Desktop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Add ContextStream as an MCP server in your Claude Desktop config:
                </p>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "contextstream": {
      "command": "npx",
      "args": [
        "@contextstream/mcp-server",
        "--api-key",
        "your_api_key"
      ]
    }
  }
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Book className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Adding Sources</CardTitle>
                <CardDescription>
                  Index documentation websites and repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">Supported source types:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Public documentation websites</li>
                  <li>GitHub repositories</li>
                  <li>Confluence spaces (coming soon)</li>
                  <li>Custom sources</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GitBranch className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Self-Hosting</CardTitle>
                <CardDescription>
                  Deploy ContextStream on your own infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  ContextStream is open source and can be self-hosted with Docker:
                </p>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`docker-compose up -d`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                We're here to help you get the most out of ContextStream
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">GitHub Issues</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Report bugs, request features, or ask questions
                  </p>
                  <Button variant="outline" asChild>
                    <Link
                      href="https://github.com/contextstream/contextstream/issues"
                      target="_blank"
                    >
                      Open an Issue
                    </Link>
                  </Button>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Full Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Visit our comprehensive documentation on GitHub
                  </p>
                  <Button variant="outline" asChild>
                    <Link
                      href="https://github.com/contextstream/contextstream"
                      target="_blank"
                    >
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
