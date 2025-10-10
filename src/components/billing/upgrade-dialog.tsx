/**
 * Upgrade Dialog Component
 * Modal dialog prompting users to upgrade their plan
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCreateCheckout } from '@/hooks/use-subscription'
import { PlanTier } from '@prisma/client'
import { Check, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
  currentTier?: PlanTier
  suggestedTier?: PlanTier
}

const PLAN_DETAILS = {
  [PlanTier.STARTER]: {
    name: 'Starter',
    price: 9,
    features: [
      '1,000 searches/month',
      '20 documentation sources',
      '3 workspaces',
      '5,000 pages indexed',
      'API access (60 req/min)',
    ],
  },
  [PlanTier.PRO]: {
    name: 'Pro',
    price: 19,
    features: [
      '10,000 searches/month',
      '100 documentation sources',
      '10 workspaces',
      '50,000 pages indexed',
      'API access (120 req/min)',
      'Advanced search features',
    ],
  },
  [PlanTier.TEAM]: {
    name: 'Team',
    price: 49,
    features: [
      '50,000 searches/month',
      '500 documentation sources',
      '50 workspaces',
      '250,000 pages indexed',
      'API access (300 req/min)',
      'Team collaboration',
    ],
  },
}

export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  currentTier = PlanTier.FREE,
  suggestedTier = PlanTier.STARTER,
}: UpgradeDialogProps) {
  const createCheckout = useCreateCheckout()
  const [selectedTier, setSelectedTier] = useState<PlanTier>(suggestedTier)

  const handleUpgrade = async () => {
    try {
      await createCheckout.mutateAsync(selectedTier)
    } catch (error) {
      console.error('Failed to create checkout:', error)
    }
  }

  // Get available plans (exclude FREE and SELF_HOSTED, and plans at or below current tier)
  const availableTiers = [PlanTier.STARTER, PlanTier.PRO, PlanTier.TEAM].filter((tier) => {
    const currentIndex = Object.values(PlanTier).indexOf(currentTier)
    const tierIndex = Object.values(PlanTier).indexOf(tier)
    return tierIndex > currentIndex
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {reason || 'Unlock more features and higher limits with a paid plan'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableTiers.map((tier) => {
            const plan = PLAN_DETAILS[tier]
            const isSelected = selectedTier === tier
            const isRecommended = tier === suggestedTier

            return (
              <div
                key={tier}
                className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTier(tier)}
              >
                {isRecommended && (
                  <Badge className="absolute -top-2 right-4">Recommended</Badge>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-1">
                      ${plan.price}
                      <span className="text-sm text-muted-foreground font-normal">/month</span>
                    </p>
                  </div>
                  {isSelected && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>
              • All plans include MCP integration and priority GitHub Issues support
            </p>
            <p>
              • Billing is monthly - cancel anytime
            </p>
            <p>
              • 14-day money-back guarantee
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button asChild variant="ghost">
            <Link href="/pricing">View All Plans</Link>
          </Button>
          <Button onClick={handleUpgrade} disabled={createCheckout.isPending}>
            {createCheckout.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upgrade to {PLAN_DETAILS[selectedTier].name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
