"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNetworkApi } from "../network.store";
import { useState } from "react";
import { toast } from "sonner";
import { updateUserSettings } from "@/lib/db";
import { getCurrentUserEmail } from "@/lib/firebase";

export function SettingsPanel() {
  const { payload, setLastActivity } = useNetworkApi();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    marketingEmails: false,
    activitySummary: true,
    apiKey: "",
    webhookUrl: ""
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const userEmail = await getCurrentUserEmail();
      if (!userEmail) {
        toast.error("Authentication error", {
          description: "Could not determine current user"
        });
        return;
      }

      const result = await updateUserSettings(userEmail.replace(/[.@]/g, "_"), settings);
      
      if (result.success) {
        toast.success("Settings updated", {
          description: "Your settings have been saved successfully"
        });
        
        setLastActivity("update_settings", "Updated user settings");
      } else {
        toast.error("Error", {
          description: result.message
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save settings"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-y-2">
            <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
              <span>Email Notifications</span>
              <span className="font-normal text-sm text-muted-foreground">
                Receive email notifications when important events occur
              </span>
            </Label>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, emailNotifications: checked }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between space-y-2">
            <Label htmlFor="marketing-emails" className="flex flex-col space-y-1">
              <span>Marketing Emails</span>
              <span className="font-normal text-sm text-muted-foreground">
                Receive emails about new features and offers
              </span>
            </Label>
            <Switch
              id="marketing-emails"
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, marketingEmails: checked }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between space-y-2">
            <Label htmlFor="activity-summary" className="flex flex-col space-y-1">
              <span>Activity Summary</span>
              <span className="font-normal text-sm text-muted-foreground">
                Receive a weekly summary of your network activity
              </span>
            </Label>
            <Switch
              id="activity-summary"
              checked={settings.activitySummary}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, activitySummary: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>
            Configure API access for integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              placeholder="Enter API key"
              value={settings.apiKey}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, apiKey: e.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Use this key to authenticate API requests
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://example.com/webhook"
              value={settings.webhookUrl}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              We'll send notifications to this URL
            </p>
          </div>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="w-full cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
