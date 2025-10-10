/**
 * Initialize Subscriptions for Existing Users
 * Run this script once to create FREE subscriptions for all existing users
 *
 * Usage: npx tsx scripts/init-subscriptions.ts
 */

import { PrismaClient, PlanTier } from '@prisma/client'

const prisma = new PrismaClient()

const PLANS = {
  [PlanTier.FREE]: {
    features: {
      searchesPerMonth: 50,
      maxSources: 3,
      maxWorkspaces: 1,
      maxPagesIndexed: 500,
      apiRateLimit: 30,
    }
  }
}

async function main() {
  console.log('🔍 Checking for users without subscriptions...')

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      subscription: true,
      workspaces: true,
    }
  })

  console.log(`Found ${users.length} users in total`)

  // Filter users without subscriptions
  const usersWithoutSubscription = users.filter(u => !u.subscription)

  if (usersWithoutSubscription.length === 0) {
    console.log('✅ All users already have subscriptions!')
    return
  }

  console.log(`Found ${usersWithoutSubscription.length} users without subscriptions`)
  console.log('Creating FREE subscriptions...\n')

  const freePlan = PLANS[PlanTier.FREE]
  const now = new Date()
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1) // First day of next month

  for (const user of usersWithoutSubscription) {
    try {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planTier: PlanTier.FREE,
          status: 'ACTIVE',
          searchesPerMonth: freePlan.features.searchesPerMonth,
          maxSources: freePlan.features.maxSources,
          maxWorkspaces: freePlan.features.maxWorkspaces,
          maxPagesIndexed: freePlan.features.maxPagesIndexed,
          apiRateLimit: freePlan.features.apiRateLimit,
          searchesUsed: 0,
          sourcesUsed: 0,
          workspacesUsed: user.workspaces.length || 0,
          pagesIndexed: 0,
          resetAt,
        },
      })

      console.log(`✅ Created FREE subscription for ${user.email}`)
    } catch (error) {
      console.error(`❌ Failed to create subscription for ${user.email}:`, error)
    }
  }

  console.log('\n✅ Done! All users now have subscriptions.')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
