/**
 * Query Parser
 * Parses natural language search queries to extract frameworks, keywords, and intent
 */

export interface ParsedQuery {
  original: string
  frameworks: Framework[]
  keywords: string[]
  stopWords: string[]
  requiredTerms: string[]
  intent: QueryIntent
}

export interface Framework {
  name: string // "nextjs"
  normalized: string // "Next.js"
  version?: string // "14.0"
  domains: string[] // ["nextjs.org", "vercel.com"]
}

export enum QueryIntent {
  CONCEPT = 'concept', // "what is caching"
  HOW_TO = 'how_to', // "how to cache in nextjs"
  TROUBLESHOOTING = 'troubleshooting', // "cache not working"
  CODE_EXAMPLE = 'code_example', // "show cache example"
  COMPARISON = 'comparison', // "nextjs vs remix caching"
  GENERAL = 'general', // default
}

interface FrameworkDefinition {
  aliases: string[]
  normalized: string
  domains: string[]
  patterns: RegExp[]
}

const FRAMEWORKS: Record<string, FrameworkDefinition> = {
  nextjs: {
    aliases: ['nextjs', 'next.js', 'next', 'nextapp'],
    normalized: 'Next.js',
    domains: ['nextjs.org', 'vercel.com'],
    patterns: [/next\.js/i, /next\s+js/i, /\bnext\b/i],
  },
  react: {
    aliases: ['react', 'reactjs', 'react.js'],
    normalized: 'React',
    domains: ['react.dev', 'reactjs.org', 'legacy.reactjs.org'],
    patterns: [/\breact\b/i, /react\.js/i, /reactjs/i],
  },
  vue: {
    aliases: ['vue', 'vuejs', 'vue.js'],
    normalized: 'Vue',
    domains: ['vuejs.org'],
    patterns: [/\bvue\b/i, /vue\.js/i, /vuejs/i],
  },
  angular: {
    aliases: ['angular', 'angularjs'],
    normalized: 'Angular',
    domains: ['angular.io', 'angular.dev'],
    patterns: [/\bangular\b/i, /angularjs/i],
  },
  svelte: {
    aliases: ['svelte', 'sveltejs'],
    normalized: 'Svelte',
    domains: ['svelte.dev'],
    patterns: [/\bsvelte\b/i, /sveltejs/i],
  },
  node: {
    aliases: ['node', 'nodejs', 'node.js'],
    normalized: 'Node.js',
    domains: ['nodejs.org'],
    patterns: [/\bnode\b/i, /node\.js/i, /nodejs/i],
  },
  express: {
    aliases: ['express', 'expressjs'],
    normalized: 'Express',
    domains: ['expressjs.com'],
    patterns: [/\bexpress\b/i, /expressjs/i],
  },
  tailwind: {
    aliases: ['tailwind', 'tailwindcss'],
    normalized: 'Tailwind CSS',
    domains: ['tailwindcss.com'],
    patterns: [/tailwind/i],
  },
  typescript: {
    aliases: ['typescript', 'ts'],
    normalized: 'TypeScript',
    domains: ['typescriptlang.org'],
    patterns: [/\btypescript\b/i, /\bts\b/i],
  },
  python: {
    aliases: ['python', 'py'],
    normalized: 'Python',
    domains: ['python.org', 'docs.python.org'],
    patterns: [/\bpython\b/i, /\bpy\b/i],
  },
  django: {
    aliases: ['django'],
    normalized: 'Django',
    domains: ['djangoproject.com'],
    patterns: [/\bdjango\b/i],
  },
  flask: {
    aliases: ['flask'],
    normalized: 'Flask',
    domains: ['flask.palletsprojects.com'],
    patterns: [/\bflask\b/i],
  },
  fastapi: {
    aliases: ['fastapi'],
    normalized: 'FastAPI',
    domains: ['fastapi.tiangolo.com'],
    patterns: [/\bfastapi\b/i],
  },
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'it',
  'that',
  'this',
  'be',
  'are',
  'can',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'must',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'over',
])

const INTENT_PATTERNS: Record<string, RegExp> = {
  HOW_TO: /^(how|ways?|steps?) (to|do|can|should|i)/i,
  TROUBLESHOOTING: /(not working|error|issue|problem|fix|debug|broken|fail)/i,
  CODE_EXAMPLE: /(example|sample|demo|code|snippet|implementation|show me)/i,
  COMPARISON: /(vs|versus|compare|comparison|difference|between)/i,
  CONCEPT: /^(what|why|when|where|which) (is|are|does)/i,
}

/**
 * Parse a natural language query into structured components
 */
export function parseQuery(query: string): ParsedQuery {
  const normalized = query.toLowerCase().trim()

  // 1. Detect frameworks
  const frameworks: Framework[] = []
  const detectedNames = new Set<string>()

  for (const [name, definition] of Object.entries(FRAMEWORKS)) {
    for (const pattern of definition.patterns) {
      if (pattern.test(normalized)) {
        if (!detectedNames.has(name)) {
          frameworks.push({
            name,
            normalized: definition.normalized,
            domains: definition.domains,
          })
          detectedNames.add(name)
          break
        }
      }
    }
  }

  // 2. Extract all framework terms to filter them out
  const frameworkTerms = new Set<string>()
  frameworks.forEach((fw) => {
    FRAMEWORKS[fw.name].aliases.forEach((alias) => {
      frameworkTerms.add(alias.toLowerCase())
    })
  })

  // 3. Split into words and filter
  const words = normalized.split(/\s+/)
  const keywords: string[] = []
  const stopWords: string[] = []

  for (const word of words) {
    if (word.length <= 2 && !['js', 'ts', 'py'].includes(word)) {
      continue // Skip very short words except common abbreviations
    }

    if (STOP_WORDS.has(word)) {
      stopWords.push(word)
    } else if (!frameworkTerms.has(word)) {
      keywords.push(word)
    }
  }

  // 4. Determine intent
  let intent = QueryIntent.GENERAL
  for (const [intentType, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(query)) {
      intent = QueryIntent[intentType as keyof typeof QueryIntent]
      break
    }
  }

  // 5. Build required terms (all frameworks + important keywords)
  const requiredTerms = [
    ...frameworks.map((f) => f.name),
    ...keywords.filter((k) => k.length > 3), // Only longer keywords are required
  ]

  return {
    original: query,
    frameworks,
    keywords,
    stopWords,
    requiredTerms,
    intent,
  }
}

/**
 * Check if a query is framework-specific
 */
export function isFrameworkSpecific(parsed: ParsedQuery): boolean {
  return parsed.frameworks.length > 0
}

/**
 * Get a human-readable description of the parsed query
 */
export function describeQuery(parsed: ParsedQuery): string {
  const parts: string[] = []

  if (parsed.frameworks.length > 0) {
    const frameworkNames = parsed.frameworks
      .map((f) => f.normalized)
      .join(', ')
    parts.push(`Framework: ${frameworkNames}`)
  }

  if (parsed.keywords.length > 0) {
    parts.push(`Keywords: ${parsed.keywords.join(', ')}`)
  }

  if (parsed.intent !== QueryIntent.GENERAL) {
    parts.push(`Intent: ${parsed.intent}`)
  }

  return parts.join(' | ')
}

/**
 * Get framework domains for boosting
 */
export function getFrameworkDomains(parsed: ParsedQuery): string[] {
  return parsed.frameworks.flatMap((f) => f.domains)
}
