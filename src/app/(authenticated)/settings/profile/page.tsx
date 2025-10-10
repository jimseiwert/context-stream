"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Mail,
  Calendar,
  Shield,
  Key,
  Building2,
  Save,
  Loader2,
  Camera,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { format } from "date-fns"
import { toast } from "sonner"

interface UserProfile {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  _count: {
    workspaces: number
    apiKeys: number
  }
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await apiClient.get<{ user: UserProfile }>("/api/profile")
      setName(response.user.name)
      setImageUrl(response.user.image || "")
      return response.user
    },
  })

  const updateProfile = useMutation({
    mutationFn: async (data: { name?: string; image?: string | null }) => {
      const response = await apiClient.put<{ user: UserProfile }>("/api/profile", data)
      return response.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Profile updated successfully")
    },
    onError: (error: any) => {
      const message = error.data?.error || error.message || "Failed to update profile"
      toast.error(message)
    },
  })

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim() || undefined,
      image: imageUrl.trim() || null,
    })
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      SUPER_ADMIN: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", label: "Super Admin" },
      ADMIN: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Admin" },
      USER: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", label: "User" },
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.USER

    return (
      <Badge className={config.color}>{config.label}</Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
        <p className="text-muted-foreground">Unable to load your profile information.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Picture & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your name and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profile.image || imageUrl ? (
                <img
                  src={imageUrl || profile.image || ""}
                  alt={profile.name}
                  className="h-24 w-24 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-border">
                  <User className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Camera className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="imageUrl">Profile Picture URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL for your profile picture (recommended size: 200x200px)
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Account Information (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email Address</span>
              </div>
              <div className="flex items-center space-x-2">
                <p className="font-medium">{profile.email}</p>
                {profile.emailVerified && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role</span>
              </div>
              <div>{getRoleBadge(profile.role)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member Since</span>
              </div>
              <p className="font-medium">
                {format(new Date(profile.createdAt), "MMMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Last Updated</span>
              </div>
              <p className="font-medium">
                {format(new Date(profile.updatedAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Workspaces</p>
                    <p className="text-xs text-muted-foreground">Your workspaces</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{profile._count.workspaces}</p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">API Keys</p>
                    <p className="text-xs text-muted-foreground">Active keys</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{profile._count.apiKeys}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
