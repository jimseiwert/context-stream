"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Key,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Code2,
  Boxes,
  ArrowLeft,
  AlertCircle,
  Info,
} from "lucide-react"
import { toast } from "sonner"

export default function IntegrationsPage() {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates({ ...copiedStates, [id]: true })
      toast.success("Copied to clipboard!")
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [id]: false })
      }, 2000)
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  const mcpServerUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/mcp`
    : 'https://your-domain.com/mcp'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">MCP Server Setup</h1>
          <p className="text-muted-foreground">
            Connect ContextStream to your favorite AI tools
          </p>
        </div>
      </div>

      {/* Introduction */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Boxes className="h-5 w-5 text-primary" />
            <CardTitle>What is Model Context Protocol (MCP)?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Model Context Protocol (MCP) is an open standard that enables AI applications
            to connect to external data sources and tools. ContextStream implements an MCP server
            that provides your indexed documentation to AI assistants in real-time.
          </p>
          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Benefits:</strong> AI assistants can search your documentation, answer questions
              with accurate citations, and provide context-aware responses based on your indexed sources.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Setup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Step 1: Get Your API Key</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/api-keys">
                Manage API Keys
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Before configuring your AI tools, you'll need a ContextStream API key for authentication.
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Navigate to Settings → API Keys (or click "Manage API Keys" above)</li>
            <li>Click "Create API Key" and give it a descriptive name</li>
            <li>Copy the generated key and save it securely (you won't see it again)</li>
          </ol>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Keep your API key secure. Never commit it to version control or share it publicly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* MCP Server URL */}
      <Card>
        <CardHeader>
          <CardTitle>Your MCP Server URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono">
              {mcpServerUrl}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(mcpServerUrl, 'server-url')}
            >
              {copiedStates['server-url'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claude Desktop */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Claude Desktop</CardTitle>
          </div>
          <CardDescription>
            Official desktop app with native MCP support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">1. Install Claude Desktop</h4>
            <Button variant="outline" size="sm" asChild>
              <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">
                Download Claude Desktop
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">2. Configure MCP Settings</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Add this configuration to your Claude Desktop config file:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-2 list-disc list-inside">
              <li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
              <li>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
            </ul>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "contextstream": {
      "type": "http",
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}`}
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{\n  "mcpServers": {\n    "contextstream": {\n      "type": "http",\n      "url": "${mcpServerUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
                  'claude-config'
                )}
              >
                {copiedStates['claude-config'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">3. Restart Claude Desktop</h4>
            <p className="text-xs text-muted-foreground">
              Close and reopen Claude Desktop for changes to take effect.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Claude Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle>Claude Code (CLI)</CardTitle>
          </div>
          <CardDescription>
            Anthropic's official CLI tool for Claude
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">1. Install Claude Code</h4>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
npm install -g @anthropic-ai/claude-code
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard('npm install -g @anthropic-ai/claude-code', 'claude-code-install')}
              >
                {copiedStates['claude-code-install'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">2. Add MCP Server (Recommended)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Run this command to add the MCP server (replace YOUR_API_KEY with your actual key):
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`claude mcp add --transport http contextstream ${mcpServerUrl} \\
  --header "Authorization: Bearer YOUR_API_KEY_HERE"`}
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `claude mcp add --transport http contextstream ${mcpServerUrl} --header "Authorization: Bearer YOUR_API_KEY_HERE"`,
                  'claude-code-cli'
                )}
              >
                {copiedStates['claude-code-cli'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: The name "contextstream" comes before the URL
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">3. Verify Installation</h4>
            <p className="text-xs text-muted-foreground mb-2">
              List your configured MCP servers:
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
claude mcp list
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard('claude mcp list', 'claude-code-list')}
              >
                {copiedStates['claude-code-list'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
              Alternative: Manual Configuration
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-muted-foreground">
                For project scope, create <code>.mcp.json</code> in your project root:
              </p>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "contextstream": {
      "type": "http",
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}`}
                </pre>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(
                    `{\n  "mcpServers": {\n    "contextstream": {\n      "type": "http",\n      "url": "${mcpServerUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
                    'claude-code-config'
                  )}
                >
                  {copiedStates['claude-code-config'] ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </details>

          <Button variant="outline" size="sm" asChild>
            <a href="https://docs.claude.com/claude-code" target="_blank" rel="noopener noreferrer">
              View Documentation
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Cursor */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle>Cursor IDE</CardTitle>
          </div>
          <CardDescription>
            AI-powered code editor with MCP support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">1. Install Cursor</h4>
            <Button variant="outline" size="sm" asChild>
              <a href="https://cursor.sh" target="_blank" rel="noopener noreferrer">
                Download Cursor
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">2. Configure MCP Server</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Create or edit <code>~/.cursor/mcp.json</code> (global) or <code>.cursor/mcp.json</code> (project):
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "contextstream": {
      "type": "http",
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}`}
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{\n  "mcpServers": {\n    "contextstream": {\n      "type": "http",\n      "url": "${mcpServerUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
                  'cursor-config'
                )}
              >
                {copiedStates['cursor-config'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use global config (~/.cursor/mcp.json) for all projects, or project config for specific projects
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">3. Restart Cursor</h4>
            <p className="text-xs text-muted-foreground">
              Reload Cursor window for changes to take effect (Cmd/Ctrl + Shift + P → "Reload Window")
            </p>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href="https://docs.cursor.sh/context/model-context-protocol" target="_blank" rel="noopener noreferrer">
              View Documentation
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Windsurf */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle>Windsurf</CardTitle>
          </div>
          <CardDescription>
            AI-powered IDE by Codeium with MCP support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">1. Install Windsurf</h4>
            <Button variant="outline" size="sm" asChild>
              <a href="https://codeium.com/windsurf" target="_blank" rel="noopener noreferrer">
                Download Windsurf
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">2. Configure MCP Server</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Create <code>~/.windsurf/mcp.json</code> or add to Windsurf settings:
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "contextstream": {
      "type": "http",
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}`}
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{\n  "mcpServers": {\n    "contextstream": {\n      "type": "http",\n      "url": "${mcpServerUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
                  'windsurf-config'
                )}
              >
                {copiedStates['windsurf-config'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href="https://codeium.com/windsurf/docs" target="_blank" rel="noopener noreferrer">
              View Documentation
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* GitHub Copilot */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle>VS Code with GitHub Copilot</CardTitle>
          </div>
          <CardDescription>
            Connect via MCP extension for VS Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">1. Install MCP Extension</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Search for "Model Context Protocol" in VS Code Extensions marketplace
            </p>
            <Button variant="outline" size="sm" asChild>
              <a
                href="vscode:extension/anthropics.mcp"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install MCP Extension
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">2. Configure Server</h4>
            <p className="text-xs text-muted-foreground mb-2">
              If using an MCP extension, add to VS Code settings.json (Cmd/Ctrl + Shift + P → "Preferences: Open Settings (JSON)"):
            </p>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "mcp.servers": {
    "contextstream": {
      "type": "http",
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}`}
              </pre>
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  `{\n  "mcp.servers": {\n    "contextstream": {\n      "type": "http",\n      "url": "${mcpServerUrl}",\n      "headers": {\n        "Authorization": "Bearer YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
                  'vscode-config'
                )}
              >
                {copiedStates['vscode-config'] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Configuration format depends on the specific MCP extension you're using
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Note: GitHub Copilot Chat may have limited MCP support. Check the latest documentation for compatibility.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Connection Issues</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Verify your API key is valid in Settings → API Keys</li>
              <li>Ensure the MCP server URL is correct and accessible</li>
              <li>Check that you've replaced "YOUR_API_KEY_HERE" with your actual API key</li>
              <li>Restart your AI tool after configuration changes</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">No Search Results</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Verify you have indexed sources in your workspace</li>
              <li>Check that sources have completed indexing (status: ACTIVE)</li>
              <li>Ensure your workspace has at least one global or workspace-specific source</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Authentication Errors</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>API key format: <code>Authorization: Bearer YOUR_KEY</code></li>
              <li>No quotes around the Bearer token in configuration</li>
              <li>Check API key hasn't been revoked or expired</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Testing Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Your Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            After configuring your AI tool, test the connection by asking:
          </p>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-mono">
              "Search my documentation for [topic]"
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            The AI should be able to search your indexed sources and provide relevant responses with citations.
          </p>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" asChild className="w-full justify-start">
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Model Context Protocol Specification
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full justify-start">
            <Link href="/settings/api-keys">
              <Key className="mr-2 h-4 w-4" />
              Manage API Keys
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full justify-start">
            <Link href="/sources">
              <Boxes className="mr-2 h-4 w-4" />
              View Indexed Sources
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
