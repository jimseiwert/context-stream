/**
 * GitHub Pipeline Processor
 *
 * Specialized pipeline for indexing GitHub repositories:
 * 1. LIST - Discover all documentation files in repository
 * 2. FETCH - Download file content from GitHub
 * 3. EMBED - Generate vector embeddings
 * 4. SAVE - Store in database
 *
 * Focuses on documentation files: READMEs, docs/, .md, .mdx, .txt, .rst, .adoc
 */

import { createChunks } from "@/lib/db/queries/chunks";
import { upsertPage } from "@/lib/db/queries/pages";
import { getEmbeddingProvider } from "@/lib/embeddings/provider";
import { GitHubClient, GitHubFile } from "@/lib/scraper/github-client";

export interface GitHubTask {
  file: GitHubFile;
  stage:
    | "QUEUED"
    | "FETCHING"
    | "EMBEDDING"
    | "SAVING"
    | "COMPLETED"
    | "FAILED";
  content?: string;
  error?: string;
}

export interface GitHubPipelineProgress {
  queued: number;
  fetching: number;
  embedding: number;
  saving: number;
  completed: number;
  failed: number;
  total: number;
}

export interface GitHubPipelineConfig {
  repoUrl: string;
  sourceId: string;
  githubToken?: string;
  maxFiles?: number;
  fetchConcurrency?: number;
  embeddingConcurrency?: number;
  saveConcurrency?: number;
  onProgress?: (progress: GitHubPipelineProgress) => void;
}

export class GitHubPipelineProcessor {
  private tasks = new Map<string, GitHubTask>();
  private githubClient: GitHubClient;
  private embeddingProvider: ReturnType<typeof getEmbeddingProvider>;

  private fetchQueue: GitHubTask[] = [];
  private embedQueue: GitHubTask[] = [];
  private saveQueue: GitHubTask[] = [];

  private isProcessing = false;
  private config: GitHubPipelineConfig;

  constructor(config: GitHubPipelineConfig) {
    this.config = {
      maxFiles: 1000,
      fetchConcurrency: 5,
      embeddingConcurrency: 2,
      saveConcurrency: 3,
      ...config,
    };
    this.githubClient = new GitHubClient(config.githubToken);
    this.embeddingProvider = getEmbeddingProvider();
  }

  /**
   * Start the GitHub pipeline processing
   */
  async process(): Promise<{ completed: number; failed: number }> {
    console.log(`[GitHub Pipeline] Starting for ${this.config.repoUrl}`);

    // Parse GitHub URL
    const repoInfo = this.githubClient.parseGitHubUrl(this.config.repoUrl);
    if (!repoInfo) {
      throw new Error("Invalid GitHub URL");
    }

    console.log(`[GitHub Pipeline] Parsed: ${repoInfo.owner}/${repoInfo.repo}`);

    // Check if repository is accessible
    const isAccessible = await this.githubClient.checkRepository(
      repoInfo.owner,
      repoInfo.repo
    );
    if (!isAccessible) {
      throw new Error("Repository not found or not accessible");
    }

    // List all documentation files
    console.log(`[GitHub Pipeline] Listing documentation files...`);
    const files = await this.githubClient.listFiles(
      repoInfo.owner,
      repoInfo.repo,
      repoInfo.branch,
      repoInfo.path
    );

    console.log(`[GitHub Pipeline] Found ${files.length} documentation files`);

    // Limit number of files
    const filesToProcess = files.slice(0, this.config.maxFiles!);

    // Add files to queue
    for (const file of filesToProcess) {
      const task: GitHubTask = {
        file,
        stage: "QUEUED",
      };
      this.tasks.set(file.path, task);
      this.fetchQueue.push(task);
    }

    this.reportProgress();
    this.isProcessing = true;

    // Start parallel workers for each stage
    await Promise.all([
      this.runFetchWorkers(repoInfo.owner, repoInfo.repo, repoInfo.branch),
      this.runEmbedWorkers(),
      this.runSaveWorkers(),
    ]);

    const stats = this.getProgress();
    console.log(
      `[GitHub Pipeline] Completed: ${stats.completed}, Failed: ${stats.failed}`
    );

    return {
      completed: stats.completed,
      failed: stats.failed,
    };
  }

  /**
   * Fetch workers - Download file content from GitHub
   */
  private async runFetchWorkers(owner: string, repo: string, branch?: string) {
    const workers = [];
    for (let i = 0; i < this.config.fetchConcurrency!; i++) {
      workers.push(this.fetchWorker(owner, repo, branch));
    }
    await Promise.all(workers);
  }

  private async fetchWorker(owner: string, repo: string, branch?: string) {
    while (this.isProcessing) {
      const task = this.fetchQueue.shift();
      if (!task) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        task.stage = "FETCHING";
        this.reportProgress();

        console.log(`[GitHub Pipeline] Fetching: ${task.file.path}`);
        const content = await this.githubClient.getFileContent(
          owner,
          repo,
          task.file.path,
          branch
        );

        task.content = content;
        task.stage = "EMBEDDING";
        this.embedQueue.push(task);
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[GitHub Pipeline] Fetch failed for ${task.file.path}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = error.message;
        this.reportProgress();
      }
    }
  }

  /**
   * Embed workers - Generate vector embeddings
   */
  private async runEmbedWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.embeddingConcurrency!; i++) {
      workers.push(this.embedWorker());
    }
    await Promise.all(workers);
  }

  private async embedWorker() {
    while (this.isProcessing) {
      const task = this.embedQueue.shift();
      if (!task || !task.content) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        console.log(`[GitHub Pipeline] Embedding: ${task.file.path}`);

        // Generate embeddings if content is long enough
        if (task.content && task.content.length > 50) {
          const chunks = await this.embeddingProvider.chunkAndEmbed(
            task.content
          );
          console.log(
            `[GitHub Pipeline] Generated ${chunks.length} chunks for ${task.file.path}`
          );

          // Store chunks in task for saving
          (task as any).chunks = chunks;
        }

        task.stage = "SAVING";
        this.saveQueue.push(task);
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[GitHub Pipeline] Embed failed for ${task.file.path}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = error.message;
        this.reportProgress();
      }
    }
  }

  /**
   * Save workers - Store in database
   */
  private async runSaveWorkers() {
    const workers = [];
    for (let i = 0; i < this.config.saveConcurrency!; i++) {
      workers.push(this.saveWorker());
    }
    await Promise.all(workers);
  }

  private async saveWorker() {
    while (this.isProcessing) {
      const task = this.saveQueue.shift();
      if (!task || !task.content) {
        await this.sleep(100);
        if (this.isDone()) break;
        continue;
      }

      try {
        console.log(`[GitHub Pipeline] Saving: ${task.file.path}`);

        // Extract title from file path (last segment without extension)
        const title =
          task.file.path
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") || task.file.path;

        // Save page to database
        const { page } = await upsertPage({
          sourceId: this.config.sourceId,
          url: task.file.url,
          title,
          contentText: task.content,
          contentHtml: null, // GitHub files are typically markdown, not HTML
          metadata: {
            path: task.file.path,
            sha: task.file.sha,
            size: task.file.size,
            type: task.file.type,
          },
        });

        // Save chunks with embeddings
        const chunks = (task as any).chunks;
        if (chunks && chunks.length > 0) {
          await createChunks(
            chunks.map((chunk: any, chunkIndex: number) => ({
              pageId: page.id,
              chunkIndex,
              content: chunk.content,
              embedding: chunk.embedding,
              metadata: chunk.metadata,
            }))
          );
        }

        task.stage = "COMPLETED";
        this.reportProgress();
      } catch (error: any) {
        console.error(
          `[GitHub Pipeline] Save failed for ${task.file.path}:`,
          error.message
        );
        task.stage = "FAILED";
        task.error = error.message;
        this.reportProgress();
      }
    }
  }

  /**
   * Get current progress
   */
  private getProgress(): GitHubPipelineProgress {
    const progress = {
      queued: this.fetchQueue.length,
      fetching: 0,
      embedding: this.embedQueue.length,
      saving: this.saveQueue.length,
      completed: 0,
      failed: 0,
      total: this.tasks.size,
    };

    for (const task of Array.from(this.tasks.values())) {
      if (task.stage === "FETCHING") progress.fetching++;
      else if (task.stage === "COMPLETED") progress.completed++;
      else if (task.stage === "FAILED") progress.failed++;
    }

    return progress;
  }

  /**
   * Report progress to callback
   */
  private reportProgress() {
    if (this.config.onProgress) {
      this.config.onProgress(this.getProgress());
    }
  }

  /**
   * Check if all processing is done
   */
  private isDone(): boolean {
    return (
      this.fetchQueue.length === 0 &&
      this.embedQueue.length === 0 &&
      this.saveQueue.length === 0 &&
      Array.from(this.tasks.values()).every(
        (t) => t.stage === "COMPLETED" || t.stage === "FAILED"
      )
    );
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isProcessing = false;
  }
}
