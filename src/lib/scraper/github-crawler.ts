// GitHub Repository Crawler
// Fetches file contents via GitHub API

export interface GitHubCrawlConfig {
  branch?: string;
  pathFilter?: string;
  fileTypes?: string[];
}

export interface GitHubFile {
  path: string;
  title: string;
  contentText: string;
  metadata: {
    sha: string;
    size: number;
    repoUrl: string;
    branch: string;
    crawledAt: string;
  };
}

const DEFAULT_FILE_TYPES = [".md", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".py"];
const GITHUB_API_BASE = "https://api.github.com";

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubBlobResponse {
  content: string;
  encoding: string;
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  // Handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
  const cleaned = repoUrl
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const parts = cleaned.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
  }
  return { owner: parts[0], repo: parts[1] };
}

function getGitHubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithGitHub<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: getGitHubHeaders(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API error ${response.status} for ${url}: ${body.slice(0, 200)}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Crawls a GitHub repository and returns file contents.
 * Uses the GitHub API to fetch the file tree and then retrieves each file's content.
 */
export async function crawlGitHub(
  repoUrl: string,
  config: GitHubCrawlConfig = {}
): Promise<GitHubFile[]> {
  const {
    branch = "main",
    pathFilter,
    fileTypes = DEFAULT_FILE_TYPES,
  } = config;

  const { owner, repo } = parseRepoUrl(repoUrl);

  // Fetch recursive file tree
  const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  let treeData: GitHubTreeResponse;

  try {
    treeData = await fetchWithGitHub<GitHubTreeResponse>(treeUrl);
  } catch (err) {
    // Try "master" branch as fallback if "main" failed
    if (branch === "main") {
      console.log(`[GitHub Crawler] "main" branch failed, trying "master"...`);
      const fallbackUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/master?recursive=1`;
      treeData = await fetchWithGitHub<GitHubTreeResponse>(fallbackUrl);
    } else {
      throw err;
    }
  }

  if (treeData.truncated) {
    console.warn(
      `[GitHub Crawler] Tree response was truncated for ${owner}/${repo} — some files may be missing.`
    );
  }

  // Filter to blob (file) items matching desired types and path filter
  const filesToFetch = treeData.tree.filter((item) => {
    if (item.type !== "blob") return false;
    const lowerPath = item.path.toLowerCase();

    // File type filter
    const matchesType = fileTypes.some((ext) => lowerPath.endsWith(ext.toLowerCase()));
    if (!matchesType) return false;

    // Path filter (optional prefix)
    if (pathFilter && !item.path.startsWith(pathFilter)) return false;

    return true;
  });

  console.log(
    `[GitHub Crawler] Found ${filesToFetch.length} files to fetch in ${owner}/${repo}@${branch}`
  );

  const results: GitHubFile[] = [];

  for (const item of filesToFetch) {
    try {
      const blobUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${item.sha}`;
      const blob = await fetchWithGitHub<GitHubBlobResponse>(blobUrl);

      let contentText: string;
      if (blob.encoding === "base64") {
        contentText = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8");
      } else {
        contentText = blob.content;
      }

      // Derive a title from the filename (without extension)
      const filename = item.path.split("/").pop() ?? item.path;
      const title = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

      results.push({
        path: item.path,
        title,
        contentText,
        metadata: {
          sha: item.sha,
          size: item.size ?? contentText.length,
          repoUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${item.path}`,
          branch,
          crawledAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn(`[GitHub Crawler] Failed to fetch ${item.path}:`, err);
    }
  }

  return results;
}
