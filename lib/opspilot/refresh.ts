"use server";

import { updateTag } from "next/cache";
import { OPSPILOT_CACHE_TAG } from "./api";

/**
 * Server Action behind the "Refresh data" control.
 *
 * It ONLY expires the cached OpsPilot dataset so the next render re-reads the
 * Apps Script endpoint. It performs no Gmail, Calendar, Langflow or MCP call
 * and writes nothing — consequential actions stay in IBM Bob.
 */
export async function refreshOpsPilotData(): Promise<void> {
  updateTag(OPSPILOT_CACHE_TAG);
}
