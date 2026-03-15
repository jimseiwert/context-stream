// Enterprise Slack Notifications
// Sends Block Kit messages to a Slack incoming webhook URL.
// Gated: only active when hasLicenseFeature('sso') is NOT required — Slack
// notifications are available to any workspace with a configured webhook URL,
// but the underlying sending is only attempted when the webhook is present.
//
// Block Kit reference: https://api.slack.com/reference/block-kit/blocks

export interface SlackConfig {
  /** Slack incoming webhook URL */
  webhookUrl: string;
}

/** Event types that can trigger a Slack notification */
export type SlackEventType =
  | "job_completed"
  | "job_failed"
  | "source_degraded"
  | "quota_warning";

export interface SlackEvent {
  type: SlackEventType;
  title: string;
  message: string;
  /** Optional deep-link URL shown as an action button */
  url?: string;
  /** Optional metadata fields displayed in a context section */
  fields?: { label: string; value: string }[];
}

/** Emoji prefix per event type */
const EVENT_EMOJI: Record<SlackEventType, string> = {
  job_completed: ":white_check_mark:",
  job_failed: ":x:",
  source_degraded: ":warning:",
  quota_warning: ":bell:",
};

/** Accent colour hex per event type (used for sidebar attachment colour) */
const EVENT_COLOR: Record<SlackEventType, string> = {
  job_completed: "#10b981",
  job_failed: "#ef4444",
  source_degraded: "#f59e0b",
  quota_warning: "#3b82f6",
};

/**
 * Builds a Slack Block Kit payload for the given event.
 */
function buildBlockKitPayload(event: SlackEvent): Record<string, unknown> {
  const emoji = EVENT_EMOJI[event.type];

  // Header block
  const headerBlock = {
    type: "header",
    text: {
      type: "plain_text",
      text: `${emoji} ${event.title}`,
      emoji: true,
    },
  };

  // Body section
  const bodyBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: event.message,
    },
  };

  const blocks: unknown[] = [headerBlock, bodyBlock];

  // Fields section (metadata)
  if (event.fields && event.fields.length > 0) {
    // Slack fields come in pairs — pad if odd number
    const fieldElements = event.fields.map((f) => ({
      type: "mrkdwn",
      text: `*${f.label}*\n${f.value}`,
    }));

    blocks.push({
      type: "section",
      fields: fieldElements,
    });
  }

  // Divider before action (if URL provided)
  if (event.url) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Details",
            emoji: true,
          },
          url: event.url,
          action_id: "view_details",
        },
      ],
    });
  }

  // Context footer with timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `ContextStream · ${new Date().toISOString()}`,
      },
    ],
  });

  return {
    // Legacy attachment for colour sidebar (still widely supported)
    attachments: [
      {
        color: EVENT_COLOR[event.type],
        blocks,
      },
    ],
  };
}

/**
 * Sends a Block Kit notification to a Slack incoming webhook.
 *
 * Gracefully handles all errors — logs a warning and returns without throwing.
 * The caller should never need to catch from this function.
 *
 * @example
 * await sendSlackNotification(
 *   { webhookUrl: 'https://hooks.slack.com/services/...' },
 *   {
 *     type: 'job_completed',
 *     title: 'Source indexed successfully',
 *     message: 'Source *My Docs* finished indexing with 42 pages.',
 *     fields: [{ label: 'Pages', value: '42' }],
 *   }
 * );
 */
export async function sendSlackNotification(
  config: SlackConfig,
  event: SlackEvent
): Promise<void> {
  if (!config.webhookUrl) {
    console.warn("[Slack] No webhook URL configured — skipping notification");
    return;
  }

  const payload = buildBlockKitPayload(event);

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 10 second timeout — fire and forget, don't block the pipeline
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      console.warn(
        `[Slack] Webhook returned non-OK status ${response.status}: ${body}`
      );
    }
  } catch (err) {
    // Network errors, timeouts, etc. — log and continue
    console.warn(
      "[Slack] Failed to send notification:",
      err instanceof Error ? err.message : err
    );
  }
}
