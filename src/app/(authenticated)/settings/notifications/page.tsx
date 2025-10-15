"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Settings,
  Smartphone,
} from "lucide-react"

export default function NotificationsPage() {
  // Placeholder notification preferences
  // In a real implementation, these would be stored in the database
  // and managed via API endpoints

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications and updates
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-dashed border-2">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Bell className="h-16 w-16 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Notification Settings Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                We're working on a comprehensive notification system. Soon you'll be able to customize
                how and when you receive updates about your sources, indexing jobs, and system events.
              </p>
            </div>
            <Badge variant="secondary" className="mt-4">
              In Development
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview of Future Features */}
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notifications</span>
          </CardTitle>
          <CardDescription>
            Receive important updates via email (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-indexing" className="text-base">Indexing Complete</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when source indexing is complete
              </p>
            </div>
            <Switch id="email-indexing" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-errors" className="text-base">Error Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts when indexing jobs fail
              </p>
            </div>
            <Switch id="email-errors" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-weekly" className="text-base">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Get a weekly summary of your workspace activity
              </p>
            </div>
            <Switch id="email-weekly" disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>In-App Notifications</span>
          </CardTitle>
          <CardDescription>
            Control in-app notification behavior (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="app-success" className="text-base">Success Messages</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications for successful operations
              </p>
            </div>
            <Switch id="app-success" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="app-warnings" className="text-base">Warnings</Label>
              <p className="text-sm text-muted-foreground">
                Show warning notifications
              </p>
            </div>
            <Switch id="app-warnings" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="app-info" className="text-base">Informational</Label>
              <p className="text-sm text-muted-foreground">
                Show general information notifications
              </p>
            </div>
            <Switch id="app-info" disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Admin Notifications</span>
          </CardTitle>
          <CardDescription>
            Notifications for administrative events (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin-users" className="text-base">New User Registrations</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new users register
              </p>
            </div>
            <Switch id="admin-users" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin-sources" className="text-base">Source Changes</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts about source additions or changes
              </p>
            </div>
            <Switch id="admin-sources" disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin-system" className="text-base">System Events</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about important system events
              </p>
            </div>
            <Switch id="admin-system" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Planned Features */}
      <Card>
        <CardHeader>
          <CardTitle>Planned Features</CardTitle>
          <CardDescription>
            What we're building for the notification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Real-time notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get instant updates about indexing progress and completions
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Customizable preferences</p>
                <p className="text-xs text-muted-foreground">
                  Choose which notifications you want to receive and how
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Notification history</p>
                <p className="text-xs text-muted-foreground">
                  View and manage all your past notifications in one place
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Multi-channel delivery</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email, in-app, and webhooks
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
