/**
 * dsh-session-manage — Host half.
 *
 * Registers the durable `dsh-session-manage` settings namespace (two toggles)
 * so the browser settingsScope can read them. The values persist in the
 * user-settings document (`~/.dsh/settings.yaml`).
 */
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by the dsh-session-manage plugin. */
export const SETTINGS_NAMESPACE = "dsh-session-manage";
/** Fold the assistant thinking/reasoning rows so the answer renders directly. */
export const COLLAPSE_THINKING_FIELD = "collapseThinking";
/** Show the session-activity status bar above the composer. */
export const STATUS_BAR_FIELD = "statusBar";

/**
 * Durable dsh-session-manage schema; also the wire envelope the browser scope
 * validates against. Keep the field keys and defaults in sync with the client
 * half (`lib/client.js`).
 */
export const SessionManageSettingsSchema = z.object({
  [COLLAPSE_THINKING_FIELD]: z.boolean().default(true),
  [STATUS_BAR_FIELD]: z.boolean().default(true),
});

/** Cordis plugin identity (used by the loader/composition). */
export const name = "dsh-session-manage";
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
