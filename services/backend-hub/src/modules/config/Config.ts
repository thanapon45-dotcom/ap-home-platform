/**
 * TASK-106: Config Module
 * Validates all required env vars at startup — fails fast with clear error
 */

export interface HubConfig {
  port: number;
  version: string;
  hubSecret: string;

  supabaseUrl: string;
  supabaseServiceKey: string;

  anthropicApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string | null;
  aiDailyBudgetUsd: number;

  telegramToken: string;
  telegramChatId: string;

  lineChannelSecret: string | null;
  lineChannelAccessToken: string | null;

  wpUrl: string | null;
  wpUser: string | null;
  wpAppPassword: string | null;

  fbPageId: string | null;
  fbPageAccessToken: string | null;
  fbBackendUrl: string | null;
  fbBackendSecret: string | null;

  n8nWebhookBaseUrl: string | null;
}

const REQUIRED: (keyof NodeJS.ProcessEnv)[] = [
  "HUB_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

export function loadConfig(): HubConfig {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`[Config] Missing required env vars: ${missing.join(", ")}`);
  }

  return {
    port: Number(process.env.PORT) || 3001,
    version: process.env.HUB_VERSION ?? "2.0.0",
    hubSecret: process.env.HUB_SECRET!,

    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,

    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY ?? null,
    aiDailyBudgetUsd: Number(process.env.AI_DAILY_BUDGET_USD ?? "5.00"),

    telegramToken: process.env.TELEGRAM_BOT_TOKEN!,
    telegramChatId: process.env.TELEGRAM_CHAT_ID!,

    lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? null,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null,

    wpUrl: process.env.WP_URL ?? null,
    wpUser: process.env.WP_USER ?? null,
    wpAppPassword: process.env.WP_APP_PASS ?? null,

    fbPageId: process.env.FB_PAGE_ID ?? null,
    fbPageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN ?? null,
    fbBackendUrl: process.env.FB_BACKEND_URL ?? null,
    fbBackendSecret: process.env.FB_BACKEND_SECRET ?? null,

    n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL ?? null,
  };
}
