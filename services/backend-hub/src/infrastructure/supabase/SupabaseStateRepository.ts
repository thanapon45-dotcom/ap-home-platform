/**
 * TASK-202: SupabaseStateRepository
 * Implements IStateRepository using existing hub_state table schema:
 *   { key: text (PK), value: jsonb, updated_at: timestamptz }
 *
 * v2 uses key = 'v2' to avoid conflicting with v1's key = 'default'
 * during parallel run phase (Phase 5).
 */

import { IStateRepository, HubStateData } from "@core/application/ports/IStateRepository";
import { getSupabaseClient } from "./SupabaseClient";
import { logger } from "@shared/logger";
import { AppError } from "@shared/errors";

const TABLE = "hub_state";
const STATE_KEY = "v2";

export class SupabaseStateRepository implements IStateRepository {
  async read(): Promise<HubStateData | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", STATE_KEY)
      .maybeSingle();

    if (error) {
      logger.error("[StateRepository] read error", { error: error.message });
      throw new AppError("STATE_READ_ERROR", error.message);
    }

    if (!data) return null;

    return data.value as HubStateData;
  }

  async write(state: HubStateData): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { key: STATE_KEY, value: state, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );

    if (error) {
      logger.error("[StateRepository] write error", { error: error.message });
      throw new AppError("STATE_WRITE_ERROR", error.message);
    }

    logger.debug("[StateRepository] state written");
  }
}
