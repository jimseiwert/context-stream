# Changelog

## [1.1.0](https://github.com/jimseiwert/context-stream/compare/v1.0.0...v1.1.0) (2026-03-19)


### Features

* clean up RAG corpus files on document/source deletion ([604816f](https://github.com/jimseiwert/context-stream/commit/604816f6a5ac475e2aa31fe6fe7bfe79ab8c6a9f))
* improve Add Source dialog UX for DOCUMENT and WEBSITE types ([4201a18](https://github.com/jimseiwert/context-stream/commit/4201a1872a4bce00a9a2e885555e20713585e1a0))
* Vertex AI RAG Engine ingestion + per-source config overrides ([da71936](https://github.com/jimseiwert/context-stream/commit/da719363eba2ccb1134f7d51cd9b7b86305d4eaf))

## 1.0.0 (2026-03-17)


### Features

* **admin:** add admin panel with user management, system health, and usage analytics ([fad41ac](https://github.com/jimseiwert/context-stream/commit/fad41ac57fed1244d615f9a14bfebd311b43e9a9))
* **auth:** add Google OAuth, workspace management APIs, and API key management ([fc3adea](https://github.com/jimseiwert/context-stream/commit/fc3adea559effda26007129f6a8b1bbd988832af))
* **billing:** add Stripe billing, quota enforcement, and billing UI ([f35ac5f](https://github.com/jimseiwert/context-stream/commit/f35ac5f11be506774c9f8554e29413e42ee89b0d))
* **db:** complete Drizzle schema with collections, workspace members, and vector store config ([193586a](https://github.com/jimseiwert/context-stream/commit/193586a580f1027338f9ce5dc7aec237a537c9a8))
* **documents:** add document library with list, detail, chunk viewer, and source-scoped view ([9f1cbfc](https://github.com/jimseiwert/context-stream/commit/9f1cbfc46de84138ae8045a5b2890f3ecd28bf7c))
* **enterprise:** add license validation, SSO config, Slack notifications, Confluence and Notion crawlers ([f9f301f](https://github.com/jimseiwert/context-stream/commit/f9f301f49f07d3f5d46227ef106d38f2f8b515e6))
* **helm:** add Helm chart for Kubernetes deployment ([1fd5b91](https://github.com/jimseiwert/context-stream/commit/1fd5b9100dff5c1f200491f256ecb3cda318a2e6))
* **helm:** add pre-upgrade migration Hook Job ([0f8d27e](https://github.com/jimseiwert/context-stream/commit/0f8d27e41dc41cad8c18f1560472f55e5eeb8e6d))
* **jobs:** add job SSE streaming, job monitor UI, and dashboard integration ([08a7927](https://github.com/jimseiwert/context-stream/commit/08a7927f814f287ae7a236cd269a3dec42b48abe))
* redesign embedding/vector store config with shared credentials and RAG engine support ([31c2029](https://github.com/jimseiwert/context-stream/commit/31c202950174280d01df7419c051fe9b0ea32c38))
* **search:** add hybrid search engine, search UI, and MCP server ([0510e7a](https://github.com/jimseiwert/context-stream/commit/0510e7ad0a5ed49ba406f244d9950bbc3874948b))
* SEO overhaul, route reorganization, and OG image ([9ac39db](https://github.com/jimseiwert/context-stream/commit/9ac39db562d01bc622c3ae5e9957d4a1c55541d7))
* SEO overhaul, route reorganization, and OG image ([#18](https://github.com/jimseiwert/context-stream/issues/18)) ([0f1ee07](https://github.com/jimseiwert/context-stream/commit/0f1ee072aea844dcc8e89001fd3f909796665081))
* **shell:** add app theme tokens and utility classes to globals.css ([68a0430](https://github.com/jimseiwert/context-stream/commit/68a0430149c8481096b1009669c7c3851970866a))
* **shell:** add AppShell wrapper with ambient glows and Toaster ([bce2ff2](https://github.com/jimseiwert/context-stream/commit/bce2ff22aa54653e161f466e18b90df6824fb6b3))
* **shell:** add AppTopbar with breadcrumbs, workspace stub, and user menu ([cafcab0](https://github.com/jimseiwert/context-stream/commit/cafcab0aa63c6b8cade21e8a2bb4496f0243334b))
* **shell:** add collapsible AppSidebar with role-gated nav sections ([269988e](https://github.com/jimseiwert/context-stream/commit/269988ea34d9520c5a345835a46b3bfb3b2b187b))
* **shell:** add ComingSoon component and all route stubs ([20043a3](https://github.com/jimseiwert/context-stream/commit/20043a39ce767cc062089e1c11ea4e3e30db651a))
* **shell:** add command palette (⌘K) with full nav shortcuts ([a7b75ec](https://github.com/jimseiwert/context-stream/commit/a7b75ec7a3748532e424b228d1f5ff5b59933a63))
* **shell:** add ShellContext for sidebar collapse state ([7f36f5b](https://github.com/jimseiwert/context-stream/commit/7f36f5b99f2daf127f021caf5d524eb2b418afbc))
* **shell:** wire authenticated layout to AppShell ([c1336ef](https://github.com/jimseiwert/context-stream/commit/c1336ef7798bb2135967feeca46692a34dff924c))
* **sources:** add source management API, crawlers, chunking, embedding service, and sources UI ([3946783](https://github.com/jimseiwert/context-stream/commit/39467833545a16999c11c49f4b0c65f00c1d28f2))
* **worker:** add external worker (Mode 2) and Kubernetes dispatch (Mode 3) ([ea76f8f](https://github.com/jimseiwert/context-stream/commit/ea76f8fca423de2d4d4b71b1c2c7a8e898e057df))


### Bug Fixes

* **build:** suppress google-auth-library optional dep warning ([f3469b9](https://github.com/jimseiwert/context-stream/commit/f3469b9edc3bcc2bc4628b004918413ff5ef6fae))
* **mcp:** move MCP route from /mcp to /api/mcp to resolve page/route path collision ([021fbc7](https://github.com/jimseiwert/context-stream/commit/021fbc71350ac42cec675011666dcf9e5e468e93))
* replace drizzle-kit with programmatic migrator in production image ([ae6f2f6](https://github.com/jimseiwert/context-stream/commit/ae6f2f6200a2829057e180d8c8803a43beb108e5))
* **security:** resolve npm audit vulnerabilities ([3a8d47b](https://github.com/jimseiwert/context-stream/commit/3a8d47b6dee5cdf6898c4ad102e5e7b1df23ffd0))
* **shell:** fix nav active-state collision, remove :any in permissions, add admin route guard ([e532d6a](https://github.com/jimseiwert/context-stream/commit/e532d6a5e948bf1ba65a924da30ad768ba57dfd4))
* update worker entrypoint and docs for automatic migrations ([1614ef7](https://github.com/jimseiwert/context-stream/commit/1614ef7dc4da47d4f8e3690b493475a92bb28679))
* use image digest for Trivy scan to avoid invalid PR ref tags ([26fd18a](https://github.com/jimseiwert/context-stream/commit/26fd18a519d2261f9ba5d84c2759fa340243a13c))
