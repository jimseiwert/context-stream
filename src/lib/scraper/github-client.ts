// GitHub API client for listing and fetching repository files

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubFile {
  path: string;
  url: string;
  sha: string;
  size: number;
  type: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

const DOC_EXTENSIONS = new Set([
  ".md", ".mdx", ".txt", ".rst", ".adoc", ".asciidoc",
]);

export class GitHubClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ContextStream/1.0",
    };
    if (this.token) {
      (h as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }

  parseGitHubUrl(
    url: string
  ): { owner: string; repo: string; branch?: string; path?: string } | null {
    const cleaned = url
      .replace(/^https?:\/\//, "")
      .replace(/^github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");

    const parts = cleaned.split("/");
    if (parts.length < 2) return null;

    const [owner, repo, , branch, ...rest] = parts;
    return {
      owner,
      repo,
      branch: branch || undefined,
      path: rest.length > 0 ? rest.join("/") : undefined,
    };
  }

  async checkRepository(owner: string, repo: string): Promise<boolean> {
    try {
      const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listFiles(
    owner: string,
    repo: string,
    branch?: string,
    pathPrefix?: string
  ): Promise<GitHubFile[]> {
    const ref = branch || "HEAD";
    const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

    const res = await fetch(treeUrl, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to list GitHub files: ${res.statusText}`);
    }

    const data = (await res.json()) as { tree: GitHubTreeItem[] };

    return data.tree
      .filter((item) => {
        if (item.type !== "blob") return false;
        const ext = "." + item.path.split(".").pop()!.toLowerCase();
        if (!DOC_EXTENSIONS.has(ext)) return false;
        if (pathPrefix && !item.path.startsWith(pathPrefix)) return false;
        return true;
      })
      .map((item) => ({
        path: item.path,
        url: `https://github.com/${owner}/${repo}/blob/${ref}/${item.path}`,
        sha: item.sha,
        size: item.size ?? 0,
        type: item.type,
      }));
  }

  async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    branch?: string
  ): Promise<string> {
    const ref = branch || "HEAD";
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`;

    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${res.statusText}`);
    }

    const data = (await res.json()) as { content: string; encoding: string };
    if (data.encoding === "base64") {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString(
        "utf-8"
      );
    }
    return data.content;
  }
}
