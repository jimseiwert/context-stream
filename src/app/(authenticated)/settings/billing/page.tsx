/**
 * Billing Settings Page
 * Manage subscription, view usage, and access billing portal
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSubscription, useCancelSubscription, useBillingPortal } from '@/hooks/use-subscription'
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, Calendar, ExternalLink } from 'lucide-react'
import { UsageOverview } from '@/components/dashboard/usage-overview'
import Link from 'next/link'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const { data, isLoading, error } = useSubscription()
  const cancelMutation = useCancelSubscription()
  const portalMutation = useBillingPortal()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Check for success/upgrade query parameters
  useEffect(() => {
    const success = searchParams.get('success')
    const upgraded = searchParams.get('upgraded')
    if (success === 'true' || upgraded === 'true') {
      setShowSuccessMessage(true)
      // Clear the message after 5 seconds
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleCancelSubscription = async () => {
    try {
      await cancelMutation.mutateAsync()
      setShowCancelDialog(false)
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error)
    }
  }

  const handleOpenBillingPortal = async () => {
    try {
      await portalMutation.mutateAsync()
    } catch (error: any) {
      console.error('Failed to open billing portal:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and view usage statistics
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load subscription data. You may not have an active subscription yet.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              Choose a plan to get started with Context Stream
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/pricing">View Plans</Link>
            </Button>
          </CardFooter>
        </Card>

        <UsageOverview />
      </div>
    )
  }

  const subscription = data?.subscription

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and view usage statistics
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              Choose a plan to get started with Context Stream
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/pricing">View Plans</Link>
            </Button>
          </CardFooter>
        </Card>

        <UsageOverview />
      </div>
    )
  }

  const isFreePlan = subscription.planTier === 'FREE'
  const isCanceled = subscription.cancelAtPeriodEnd

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {searchParams.get('upgraded') === 'true'
              ? 'Subscription updated successfully! Your new limits are now active.'
              : 'Subscription activated successfully! Welcome to your new plan.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription className="mt-2">
                {subscription.planTier} Plan
              </CardDescription>
            </div>
            <Badge variant={isCanceled ? 'destructive' : 'default'}>
              {isCanceled ? 'Canceling' : subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCanceled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be canceled on{' '}
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : 'the end of your billing period'}
                . You&apos;ll retain access until then.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Searches per Month</span>
              <span className="font-medium">{subscription.searchesPerMonth.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Maximum Sources</span>
              <span className="font-medium">{subscription.maxSources.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Maximum Workspaces</span>
              <span className="font-medium">{subscription.maxWorkspaces.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Maximum Pages Indexed</span>
              <span className="font-medium">{subscription.maxPagesIndexed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">API Rate Limit</span>
              <span className="font-medium">{subscription.apiRateLimit} req/min</span>
            </div>
          </div>

          {subscription.currentPeriodEnd && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {isCanceled ? 'Ends' : 'Renews'} on{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!isFreePlan && (
            <>
              <Button
                variant="outline"
                onClick={handleOpenBillingPortal}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>

              {!isCanceled && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelMutation.isPending}
                >
                  Cancel Subscription
                </Button>
              )}
            </>
          )}

          <Button asChild variant={isFreePlan ? 'default' : 'outline'}>
            <Link href="/pricing">
              {isFreePlan ? 'Upgrade Plan' : 'View Plans'}
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Usage Overview */}
      <UsageOverview />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period.
              After that, you'll be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error handling */}
      {cancelMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {cancelMutation.error?.message || 'Failed to cancel subscription'}
          </AlertDescription>
        </Alert>
      )}

      {portalMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {portalMutation.error?.message || 'Failed to open billing portal'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
