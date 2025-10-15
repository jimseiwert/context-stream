/**
 * GitHub API Client
 *
 * Fetches repository content for documentation indexing
 * Supports: README, docs/, code files, wikis
 */

interface GitHubRepoInfo {
  owner: string
  repo: string
  branch?: string
  path?: string
}

export interface GitHubFile {
  path: string
  content: string
  sha: string
  type: 'file' | 'dir'
  size: number
  url: string
}

export class GitHubClient {
  private apiBaseUrl = 'https://api.github.com'
  private rawBaseUrl = 'https://raw.githubusercontent.com'
  private token?: string

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN
  }

  /**
   * Parse GitHub URL to extract owner/repo/branch/path
   */
  parseGitHubUrl(url: string): GitHubRepoInfo | null {
    try {
      const parsed = new URL(url)

      if (parsed.hostname !== 'github.com') {
        return null
      }

      // Parse path: /owner/repo/tree/branch/path or /owner/repo
      const parts = parsed.pathname.split('/').filter(Boolean)

      if (parts.length < 2) {
        return null
      }

      const owner = parts[0]
      const repo = parts[1]

      // Handle /owner/repo/tree/branch/path format
      if (parts[2] === 'tree' && parts.length >= 4) {
        const branch = parts[3]
        const path = parts.slice(4).join('/')
        return { owner, repo, branch, path }
      }

      // Handle /owner/repo/blob/branch/file format
      if (parts[2] === 'blob' && parts.length >= 4) {
        const branch = parts[3]
        const path = parts.slice(4).join('/')
        return { owner, repo, branch, path }
      }

      return { owner, repo }
    } catch {
      return null
    }
  }

  /**
   * Get repository default branch
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const url = `${this.apiBaseUrl}/repos/${owner}/${repo}`
    const response = await this.fetchWithAuth(url)
    const data = await response.json()
    return data.default_branch || 'main'
  }

  /**
   * List all documentation files in repository
   */
  async listFiles(
    owner: string,
    repo: string,
    branch?: string,
    path: string = ''
  ): Promise<GitHubFile[]> {
    const defaultBranch = branch || await this.getDefaultBranch(owner, repo)
    const files: GitHubFile[] = []

    await this.recursiveListFiles(owner, repo, defaultBranch, path, files)

    return files
  }

  /**
   * Recursively list files in a directory
   */
  private async recursiveListFiles(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    files: GitHubFile[]
  ): Promise<void> {
    const url = `${this.apiBaseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

    try {
      const response = await this.fetchWithAuth(url)
      const items = await response.json()

      if (!Array.isArray(items)) {
        return
      }

      for (const item of items) {
        // Only process documentation-relevant files
        if (item.type === 'file') {
          const ext = item.name.toLowerCase().split('.').pop()
          const isDoc = ['md', 'mdx', 'txt', 'rst', 'adoc', 'ipynb'].includes(ext || '')
          const isReadme = item.name.toLowerCase().startsWith('readme')

          if (isDoc || isReadme) {
            files.push({
              path: item.path,
              content: '', // Will be fetched separately
              sha: item.sha,
              type: 'file',
              size: item.size,
              url: item.html_url,
            })
          }
        } else if (item.type === 'dir') {
          // Recurse into documentation-related directories
          const dirName = item.name.toLowerCase()
          const isDocDir = ['docs', 'doc', 'documentation', 'wiki', 'guides', 'examples'].includes(dirName)

          if (isDocDir || path === '') {
            await this.recursiveListFiles(owner, repo, branch, item.path, files)
          }
        }
      }
    } catch (error: any) {
      console.error(`[GitHub] Error listing files at ${path}:`, error.message)
    }
  }

  /**
   * Get file content from GitHub
   */
  async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    branch?: string
  ): Promise<string> {
    const defaultBranch = branch || await this.getDefaultBranch(owner, repo)
    const url = `${this.rawBaseUrl}/${owner}/${repo}/${defaultBranch}/${filePath}`

    try {
      const response = await this.fetchWithAuth(url)
      return await response.text()
    } catch (error: any) {
      console.error(`[GitHub] Error fetching file ${filePath}:`, error.message)
      throw error
    }
  }

  /**
   * Check if repository exists and is accessible
   */
  async checkRepository(owner: string, repo: string): Promise<boolean> {
    try {
      const url = `${this.apiBaseUrl}/repos/${owner}/${repo}`
      const response = await this.fetchWithAuth(url)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Fetch with authentication headers
   */
  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: HeadersInit = {
      'User-Agent': 'ContextStream/1.0 (Documentation Indexer; +https://contextstream.ai)',
      'Accept': 'application/vnd.github.v3+json',
    }

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response
  }
}
