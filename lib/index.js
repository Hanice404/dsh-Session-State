/**
 * dsh-session-state — Host half.
 *
 * Registers the durable `dsh-session-state` settings namespace (three toggles)
 * so the browser settingsScope can read them. The values persist in the
 * user-settings document (`~/.dsh/settings.yaml`).
 */
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by the dsh-session-state plugin. */
export const SETTINGS_NAMESPACE = "dsh-session-state";
/** Fold the assistant thinking/reasoning rows so the answer renders directly. */
export const COLLAPSE_THINKING_FIELD = "collapseThinking";
/** Fold the tool-call content rows (Bash/Edit/Read/…) so the answer renders directly. */
export const COLLAPSE_TOOLS_FIELD = "collapseTools";
/** Show the session-activity status bar above the composer. */
export const STATUS_BAR_FIELD = "statusBar";

/**
 * Durable dsh-session-state schema; also the wire envelope the browser scope
 * validates against. Keep the field keys and defaults in sync with the client
 * half (`lib/client.js`).
 */
export const SessionManageSettingsSchema = z.object({
  [COLLAPSE_THINKING_FIELD]: z.boolean().default(true),
  [COLLAPSE_TOOLS_FIELD]: z.boolean().default(true),
  [STATUS_BAR_FIELD]: z.boolean().default(true),
});

/** Cordis plugin identity (used by the loader/composition). */
export const name = "dsh-session-state";
/** Node half waits for the settings service before registering the namespace. */
export const inject = ["settings"];

/**
 * Host half of the plugin: register the durable settings namespace.
 * @param ctx - Host cordis context.
 */
export function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), SessionManageSettingsSchema);
  });
}
