/**
 * Seed Global Documentation Sources
 * Inserts official documentation URLs as global sources with monthly rescrape schedule
 *
 * Usage: npx tsx scripts/seed-global-docs.ts
 */

import { PrismaClient, SourceType, SourceScope, SourceStatus, RescrapeSchedule } from '@prisma/client'

const prisma = new PrismaClient()

// Documentation sources organized by category
const DOCUMENTATION_SOURCES = [
  // Programming Languages
  {
    name: 'JavaScript',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    tags: ['language:javascript', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'TypeScript',
    url: 'https://www.typescriptlang.org/docs/',
    tags: ['language:typescript', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Python',
    url: 'https://docs.python.org/3/',
    tags: ['language:python', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Java',
    url: 'https://docs.oracle.com/en/java/',
    tags: ['language:java', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'C#',
    url: 'https://learn.microsoft.com/en-us/dotnet/csharp/',
    tags: ['language:csharp', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Go',
    url: 'https://go.dev/doc/',
    tags: ['language:go', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Rust',
    url: 'https://doc.rust-lang.org/',
    tags: ['language:rust', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'PHP',
    url: 'https://www.php.net/docs.php',
    tags: ['language:php', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Ruby',
    url: 'https://www.ruby-lang.org/en/documentation/',
    tags: ['language:ruby', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Swift',
    url: 'https://www.swift.org/documentation/',
    tags: ['language:swift', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Kotlin',
    url: 'https://kotlinlang.org/docs/home.html',
    tags: ['language:kotlin', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Dart',
    url: 'https://dart.dev/guides',
    tags: ['language:dart', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'C++',
    url: 'https://en.cppreference.com/',
    tags: ['language:cpp', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Scala',
    url: 'https://docs.scala-lang.org/',
    tags: ['language:scala', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'R',
    url: 'https://cran.r-project.org/manuals.html',
    tags: ['language:r', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'SQL (PostgreSQL)',
    url: 'https://www.postgresql.org/docs/',
    tags: ['language:sql', 'docs:official', 'topic:database', 'category:language'],
  },
  {
    name: 'Bash',
    url: 'https://www.gnu.org/software/bash/manual/',
    tags: ['language:bash', 'docs:official', 'topic:shell', 'category:language'],
  },
  {
    name: 'PowerShell',
    url: 'https://learn.microsoft.com/en-us/powershell/',
    tags: ['language:powershell', 'docs:official', 'topic:shell', 'category:language'],
  },
  {
    name: 'Lua',
    url: 'https://www.lua.org/manual/',
    tags: ['language:lua', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Elixir',
    url: 'https://hexdocs.pm/elixir/',
    tags: ['language:elixir', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Haskell',
    url: 'https://www.haskell.org/documentation/',
    tags: ['language:haskell', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Clojure',
    url: 'https://clojure.org/reference/documentation',
    tags: ['language:clojure', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Erlang',
    url: 'https://www.erlang.org/docs',
    tags: ['language:erlang', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'OCaml',
    url: 'https://ocaml.org/docs',
    tags: ['language:ocaml', 'docs:official', 'topic:programming', 'category:language'],
  },
  {
    name: 'Nim',
    url: 'https://nim-lang.org/documentation.html',
    tags: ['language:nim', 'docs:official', 'topic:programming', 'category:language'],
  },

  // Frontend Frameworks
  {
    name: 'Vue.js',
    url: 'https://vuejs.org/guide/introduction.html',
    tags: ['framework:vue', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Angular',
    url: 'https://angular.dev/overview',
    tags: ['framework:angular', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Svelte',
    url: 'https://svelte.dev/docs/introduction',
    tags: ['framework:svelte', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'SolidJS',
    url: 'https://www.solidjs.com/docs/latest',
    tags: ['framework:solid', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Alpine.js',
    url: 'https://alpinejs.dev/start-here',
    tags: ['framework:alpine', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Lit',
    url: 'https://lit.dev/docs/',
    tags: ['framework:lit', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Preact',
    url: 'https://preactjs.com/guide/v10/getting-started',
    tags: ['framework:preact', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Ember.js',
    url: 'https://guides.emberjs.com/release/',
    tags: ['framework:ember', 'docs:official', 'topic:frontend', 'category:framework'],
  },
  {
    name: 'Stimulus',
    url: 'https://stimulus.hotwired.dev/reference/introduction',
    tags: ['framework:stimulus', 'docs:official', 'topic:frontend', 'category:framework'],
  },

  // Game Engines
  {
    name: 'Unity',
    url: 'https://docs.unity3d.com/Manual/index.html',
    tags: ['engine:unity', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Unreal Engine',
    url: 'https://docs.unrealengine.com/',
    tags: ['engine:unreal', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Godot',
    url: 'https://docs.godotengine.org/',
    tags: ['engine:godot', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Phaser',
    url: 'https://phaser.io/learn',
    tags: ['engine:phaser', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Babylon.js',
    url: 'https://doc.babylonjs.com/',
    tags: ['engine:babylon', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Three.js',
    url: 'https://threejs.org/docs/',
    tags: ['library:three', 'docs:official', 'topic:3d', 'category:library'],
  },
  {
    name: 'Cocos2d-x',
    url: 'https://docs.cocos.com/cocos2d-x/manual/en/',
    tags: ['engine:cocos', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Defold',
    url: 'https://defold.com/manuals/introduction/',
    tags: ['engine:defold', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Construct 3',
    url: 'https://www.construct.net/en/make-games/manuals/construct-3',
    tags: ['engine:construct', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'GameMaker Studio',
    url: 'https://manual.gamemaker.io/monthly/en/',
    tags: ['engine:gamemaker', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'LÖVE (Love2D)',
    url: 'https://love2d.org/wiki/Main_Page',
    tags: ['engine:love2d', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Pygame',
    url: 'https://www.pygame.org/docs/',
    tags: ['library:pygame', 'docs:official', 'topic:gamedev', 'category:library'],
  },
  {
    name: 'libGDX',
    url: 'https://libgdx.com/wiki/',
    tags: ['library:libgdx', 'docs:official', 'topic:gamedev', 'category:library'],
  },
  {
    name: 'MonoGame',
    url: 'https://docs.monogame.net/',
    tags: ['engine:monogame', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Bevy',
    url: 'https://bevyengine.org/learn/',
    tags: ['engine:bevy', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },
  {
    name: 'Amethyst',
    url: 'https://book.amethyst.rs/',
    tags: ['engine:amethyst', 'docs:official', 'topic:gamedev', 'category:gameengine'],
  },

  // UI Component Libraries
  {
    name: 'Material-UI (MUI)',
    url: 'https://mui.com/material-ui/getting-started/',
    tags: ['library:mui', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Ant Design',
    url: 'https://ant.design/docs/react/introduce',
    tags: ['library:antd', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Chakra UI',
    url: 'https://chakra-ui.com/docs/getting-started',
    tags: ['library:chakra', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Mantine',
    url: 'https://mantine.dev/getting-started/',
    tags: ['library:mantine', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'React Bootstrap',
    url: 'https://react-bootstrap.github.io/docs/getting-started/introduction',
    tags: ['library:react-bootstrap', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Semantic UI React',
    url: 'https://react.semantic-ui.com/',
    tags: ['library:semantic-ui', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Headless UI',
    url: 'https://headlessui.com/',
    tags: ['library:headless-ui', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Radix UI',
    url: 'https://www.radix-ui.com/primitives/docs/overview/introduction',
    tags: ['library:radix', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Arco Design',
    url: 'https://arco.design/react/en-US/docs/start',
    tags: ['library:arco', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Fluent UI',
    url: 'https://react.fluentui.dev/',
    tags: ['library:fluent', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Carbon Design System',
    url: 'https://carbondesignsystem.com/developing/get-started',
    tags: ['library:carbon', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Polaris (Shopify)',
    url: 'https://polaris.shopify.com/',
    tags: ['library:polaris', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Primer',
    url: 'https://primer.style/',
    tags: ['library:primer', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Spectrum (Adobe)',
    url: 'https://react-spectrum.adobe.com/react-spectrum/',
    tags: ['library:spectrum', 'docs:official', 'topic:ui', 'category:ui-library'],
  },
  {
    name: 'Lightning Design System',
    url: 'https://www.lightningdesignsystem.com/',
    tags: ['library:lightning', 'docs:official', 'topic:ui', 'category:ui-library'],
  },

  // CSS Frameworks
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com/docs',
    tags: ['framework:tailwind', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Bootstrap',
    url: 'https://getbootstrap.com/docs/',
    tags: ['framework:bootstrap', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Bulma',
    url: 'https://bulma.io/documentation/',
    tags: ['framework:bulma', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Foundation',
    url: 'https://get.foundation/sites/docs/',
    tags: ['framework:foundation', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'UIkit',
    url: 'https://getuikit.com/docs/introduction',
    tags: ['framework:uikit', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Materialize CSS',
    url: 'https://materializecss.com/getting-started.html',
    tags: ['framework:materialize', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Semantic UI CSS',
    url: 'https://semantic-ui.com/introduction/getting-started.html',
    tags: ['framework:semantic-ui', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Windi CSS',
    url: 'https://windicss.org/guide/',
    tags: ['framework:windi', 'docs:official', 'topic:css', 'category:css-framework'],
  },
  {
    name: 'Tachyons',
    url: 'https://tachyons.io/docs/',
    tags: ['framework:tachyons', 'docs:official', 'topic:css', 'category:css-framework'],
  },

  // CSS-in-JS
  {
    name: 'Styled Components',
    url: 'https://styled-components.com/docs',
    tags: ['library:styled-components', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },
  {
    name: 'Emotion',
    url: 'https://emotion.sh/docs/introduction',
    tags: ['library:emotion', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },
  {
    name: 'Stitches',
    url: 'https://stitches.dev/docs/introduction',
    tags: ['library:stitches', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },
  {
    name: 'Vanilla Extract',
    url: 'https://vanilla-extract.style/documentation/',
    tags: ['library:vanilla-extract', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },
  {
    name: 'Styled System',
    url: 'https://styled-system.com/getting-started',
    tags: ['library:styled-system', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },
  {
    name: 'Theme UI',
    url: 'https://theme-ui.com/getting-started',
    tags: ['library:theme-ui', 'docs:official', 'topic:css-in-js', 'category:styling'],
  },

  // CSS Preprocessors
  {
    name: 'PostCSS',
    url: 'https://postcss.org/docs/',
    tags: ['tool:postcss', 'docs:official', 'topic:css', 'category:preprocessor'],
  },
  {
    name: 'Sass/SCSS',
    url: 'https://sass-lang.com/documentation/',
    tags: ['language:sass', 'docs:official', 'topic:css', 'category:preprocessor'],
  },
  {
    name: 'Less',
    url: 'https://lesscss.org/',
    tags: ['language:less', 'docs:official', 'topic:css', 'category:preprocessor'],
  },
  {
    name: 'Stylus',
    url: 'https://stylus-lang.com/',
    tags: ['language:stylus', 'docs:official', 'topic:css', 'category:preprocessor'],
  },
  {
    name: 'CSS Modules',
    url: 'https://github.com/css-modules/css-modules',
    tags: ['tool:css-modules', 'docs:official', 'topic:css', 'category:styling'],
  },

  // DevOps & Infrastructure
  {
    name: 'Docker',
    url: 'https://docs.docker.com/',
    tags: ['tool:docker', 'docs:official', 'topic:devops', 'category:container'],
  },
  {
    name: 'Kubernetes',
    url: 'https://kubernetes.io/docs/home/',
    tags: ['platform:kubernetes', 'docs:official', 'topic:devops', 'category:orchestration'],
  },
  {
    name: 'Terraform',
    url: 'https://developer.hashicorp.com/terraform/docs',
    tags: ['tool:terraform', 'docs:official', 'topic:devops', 'category:iac'],
  },
  {
    name: 'Ansible',
    url: 'https://docs.ansible.com/',
    tags: ['tool:ansible', 'docs:official', 'topic:devops', 'category:automation'],
  },
  {
    name: 'Jenkins',
    url: 'https://www.jenkins.io/doc/',
    tags: ['tool:jenkins', 'docs:official', 'topic:devops', 'category:ci-cd'],
  },
  {
    name: 'GitHub Actions',
    url: 'https://docs.github.com/en/actions',
    tags: ['platform:github-actions', 'docs:official', 'topic:devops', 'category:ci-cd'],
  },
  {
    name: 'GitLab CI/CD',
    url: 'https://docs.gitlab.com/ee/ci/',
    tags: ['platform:gitlab', 'docs:official', 'topic:devops', 'category:ci-cd'],
  },
  {
    name: 'AWS',
    url: 'https://docs.aws.amazon.com/',
    tags: ['cloud:aws', 'docs:official', 'topic:cloud', 'category:cloud-provider'],
  },
  {
    name: 'Microsoft Azure',
    url: 'https://learn.microsoft.com/en-us/azure/',
    tags: ['cloud:azure', 'docs:official', 'topic:cloud', 'category:cloud-provider'],
  },
  {
    name: 'Google Cloud Platform',
    url: 'https://cloud.google.com/docs',
    tags: ['cloud:gcp', 'docs:official', 'topic:cloud', 'category:cloud-provider'],
  },
  {
    name: 'Prometheus',
    url: 'https://prometheus.io/docs/introduction/overview/',
    tags: ['tool:prometheus', 'docs:official', 'topic:monitoring', 'category:observability'],
  },
  {
    name: 'Grafana',
    url: 'https://grafana.com/docs/grafana/latest/',
    tags: ['tool:grafana', 'docs:official', 'topic:monitoring', 'category:observability'],
  },
  {
    name: 'Nginx',
    url: 'https://nginx.org/en/docs/',
    tags: ['server:nginx', 'docs:official', 'topic:webserver', 'category:infrastructure'],
  },
  {
    name: 'Apache HTTP Server',
    url: 'https://httpd.apache.org/docs/',
    tags: ['server:apache', 'docs:official', 'topic:webserver', 'category:infrastructure'],
  },
  {
    name: 'HashiCorp Consul',
    url: 'https://developer.hashicorp.com/consul/docs',
    tags: ['tool:consul', 'docs:official', 'topic:service-mesh', 'category:infrastructure'],
  },
  {
    name: 'HashiCorp Vault',
    url: 'https://developer.hashicorp.com/vault/docs',
    tags: ['tool:vault', 'docs:official', 'topic:secrets', 'category:security'],
  },
  {
    name: 'Istio',
    url: 'https://istio.io/latest/docs/',
    tags: ['platform:istio', 'docs:official', 'topic:service-mesh', 'category:infrastructure'],
  },
  {
    name: 'Helm',
    url: 'https://helm.sh/docs/',
    tags: ['tool:helm', 'docs:official', 'topic:kubernetes', 'category:package-manager'],
  },
  {
    name: 'Vagrant',
    url: 'https://developer.hashicorp.com/vagrant/docs',
    tags: ['tool:vagrant', 'docs:official', 'topic:devops', 'category:virtualization'],
  },
  {
    name: 'HashiCorp Packer',
    url: 'https://developer.hashicorp.com/packer/docs',
    tags: ['tool:packer', 'docs:official', 'topic:devops', 'category:image-builder'],
  },
  {
    name: 'HashiCorp Nomad',
    url: 'https://developer.hashicorp.com/nomad/docs',
    tags: ['tool:nomad', 'docs:official', 'topic:devops', 'category:orchestration'],
  },
  {
    name: 'Chef',
    url: 'https://docs.chef.io/',
    tags: ['tool:chef', 'docs:official', 'topic:devops', 'category:automation'],
  },
  {
    name: 'Puppet',
    url: 'https://www.puppet.com/docs/',
    tags: ['tool:puppet', 'docs:official', 'topic:devops', 'category:automation'],
  },
  {
    name: 'SaltStack',
    url: 'https://docs.saltproject.io/',
    tags: ['tool:saltstack', 'docs:official', 'topic:devops', 'category:automation'],
  },
  {
    name: 'Spinnaker',
    url: 'https://spinnaker.io/docs/',
    tags: ['platform:spinnaker', 'docs:official', 'topic:devops', 'category:cd'],
  },
  {
    name: 'Argo CD',
    url: 'https://argo-cd.readthedocs.io/',
    tags: ['tool:argocd', 'docs:official', 'topic:devops', 'category:gitops'],
  },
  {
    name: 'Flux',
    url: 'https://fluxcd.io/flux/',
    tags: ['tool:flux', 'docs:official', 'topic:devops', 'category:gitops'],
  },
  {
    name: 'Tekton',
    url: 'https://tekton.dev/docs/',
    tags: ['platform:tekton', 'docs:official', 'topic:devops', 'category:ci-cd'],
  },
]

async function main() {
  console.log('🚀 Starting global documentation sources seed...\n')

  const now = new Date()
  const nextScrapeAt = new Date(now)
  nextScrapeAt.setMonth(nextScrapeAt.getMonth() + 1) // Set to 1 month from now

  let created = 0
  let skipped = 0
  let errors = 0

  for (const doc of DOCUMENTATION_SOURCES) {
    try {
      // Extract domain from URL
      const domain = new URL(doc.url).hostname

      // Check if source already exists
      const existing = await prisma.source.findUnique({
        where: { url: doc.url },
      })

      if (existing) {
        console.log(`⏭️  Skipped: ${doc.name} (already exists)`)
        skipped++
        continue
      }

      // Create the source
      await prisma.source.create({
        data: {
          url: doc.url,
          domain,
          name: doc.name,
          type: SourceType.WEBSITE,
          scope: SourceScope.GLOBAL,
          status: SourceStatus.PENDING,
          rescrapeSchedule: RescrapeSchedule.MONTHLY,
          nextScrapeAt,
          tags: doc.tags,
          quality: 90, // High quality for official documentation
          metadata: {
            isOfficialDocs: true,
            addedByScript: true,
            addedAt: now.toISOString(),
          },
        },
      })

      console.log(`✅ Created: ${doc.name}`)
      created++
    } catch (error) {
      console.error(`❌ Error creating ${doc.name}:`, error)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📚 Total: ${DOCUMENTATION_SOURCES.length}`)
  console.log('='.repeat(60))

  if (created > 0) {
    console.log('\n💡 Next steps:')
    console.log('   1. These sources are marked as PENDING')
    console.log('   2. Run your scraping jobs to index the content')
    console.log('   3. Sources will automatically rescrape monthly')
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
