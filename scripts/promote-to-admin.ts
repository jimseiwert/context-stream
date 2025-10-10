#!/usr/bin/env tsx
// Script to promote a user to SUPER_ADMIN role

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function promoteToAdmin() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log('\nCurrent users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role}`)
    })

    if (users.length === 0) {
      console.log('\nNo users found in database.')
      return
    }

    // Promote the first user (or you can specify an email)
    const userToPromote = users[0]

    if (userToPromote.role === 'SUPER_ADMIN') {
      console.log(`\n✓ ${userToPromote.email} is already a SUPER_ADMIN`)
      return
    }

    console.log(`\nPromoting ${userToPromote.email} to SUPER_ADMIN...`)

    await prisma.user.update({
      where: { id: userToPromote.id },
      data: { role: 'SUPER_ADMIN' },
    })

    console.log(`✓ Successfully promoted ${userToPromote.email} to SUPER_ADMIN`)
  } catch (error) {
    console.error('Error promoting user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

promoteToAdmin()
