/**
 * dsh-session-manage — client half.
 *
 * Browser bundle loaded by the client module loader. It:
 *   1. binds the durable `dsh-session-manage` settings scope,
 *   2. folds the assistant thinking/reasoning rows (so the answer renders
 *      directly) while `collapseThinking` is enabled,
 *   3. registers a collapsible session-activity status bar on the
 *      `conversation.input.dock` seat (the row above the composer card),
 *      showing live totals for Think / Edit / Bash / Read.
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-manage',
  factory: (require) => {
    'use strict';
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var React = require('react');

    // ---------------------------------------------------------------------
    // Constants (keep in sync with lib/index.js and dsh.plugin.json)
    // ---------------------------------------------------------------------
    var NS = 'dsh-session-manage';
    var COLLAPSE_THINKING = 'collapseThinking';
    var STATUS_BAR = 'statusBar';

    var BAR_CSS_ID = 'dsh-session-manage/statusbar';
    var THINK_CSS_ID = 'dsh-session-manage/think';

    // ---------------------------------------------------------------------
    // Tool classification (mirrors the native tool-row variants)
    // ---------------------------------------------------------------------
    var BASH_TOOLS = { bash: true, pwsh: true };
    var EDIT_TOOLS = { edit: true, write: true };
    var READ_TOOLS = {
      read: true,
      web_fetch: true,
      web_search: true,
      grep: true,
      glob: true,
      cordis_package_inspect: true,
      cordis_runtime_inspect: true,
    };

    /**
     * Classify a wire tool name into one of the three status-bar tool buckets.
     * @param name - wire tool name (may be null/undefined for a windowless result).
     * @returns 'bash' | 'edit' | 'read' | null.
     */
    function classifyTool(name) {
      if (!name) return null;
      if (BASH_TOOLS[name]) return 'bash';
      if (EDIT_TOOLS[name]) return 'edit';
      if (READ_TOOLS[name]) return 'read';
      return null;
    }

    // ---------------------------------------------------------------------
    // CSS
    // ---------------------------------------------------------------------
    var BAR_CSS = [
      '.dsm-bar{box-sizing:border-box;width:100%;max-width:var(--dsh-chat-content-width);margin:0 auto;display:flex;flex-direction:column;align-items:stretch;flex:none}',
      '.dsm-toggle{display:inline-flex;align-items:center;align-self:flex-start;gap:6px;min-height:22px;max-width:100%;padding:2px 8px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer;text-align:left}',
      '.dsm-toggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dsm-toggle:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary);outline-offset:-2px}',
      '.dsm-run{width:7px;height:7px;border-radius:50%;background:var(--dsw-static-deepseek-500);flex:none;animation:1.4s ease-in-out infinite dsm-pulse}',
      '.dsm-chips{display:inline-flex;align-items:center;gap:2px;flex-wrap:wrap;min-width:0}',
      '.dsm-chip{display:inline-flex;align-items:center;gap:4px;padding:0 6px;border-radius:999px;white-space:nowrap}',
      '.dsm-chip-label{font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.dsm-chip-count{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dsm-chip-zero{opacity:.45}',
      '.dsm-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-caption);flex:none}',
      '.dsm-chip-think .dsm-dot{background:var(--dsw-static-deepseek-500)}',
      '.dsm-chip-edit .dsm-dot{background:var(--dsw-alias-state-success-primary)}',
      '.dsm-chip-bash .dsm-dot{background:var(--dsw-alias-state-warn-primary)}',
      '.dsm-chip-read .dsm-dot{background:var(--dsw-alias-state-business-primary)}',
      '.dsm-chip-active .dsm-dot{animation:1s ease-in-out infinite dsm-pulse}',
      '@keyframes dsm-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}',
      '@media (prefers-reduced-motion:reduce){.dsm-run,.dsm-chip-active .dsm-dot{animation:none}}',
      '.dsm-chevron{width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid var(--dsw-alias-label-secondary);transition:transform .15s;flex:none}',
      '.dsm-chevron-open{transform:rotate(180deg)}',
      '.dsm-panel{margin-top:2px;padding:4px 6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);border-radius:10px;display:flex;flex-direction:column}',
      '.dsm-row{display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.dsm-row-label{font-weight:500;flex:1;min-width:0}',
      '.dsm-row-count{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dsm-row-state{font-size:11px;color:var(--dsw-alias-state-business-primary)}',
      '.dsm-row-active{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsm-dot-think{background:var(--dsw-static-deepseek-500)}',
      '.dsm-dot-edit{background:var(--dsw-alias-state-success-primary)}',
      '.dsm-dot-bash{background:var(--dsw-alias-state-warn-primary)}',
      '.dsm-dot-read{background:var(--dsw-alias-state-business-primary)}',
    ].join('\n');

    // ---------------------------------------------------------------------
    // Style tag helpers
    // ---------------------------------------------------------------------
    function getStyle(id) {
      if (typeof document === 'undefined') return null;
      return document.querySelector('style[data-plugin-css=' + JSON.stringify(id) + ']');
    }
    function injectStyle(id, css) {
      if (typeof document === 'undefined') return;
      if (getStyle(id) !== null) return;
      var tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-session-manage';
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    function setStyleText(id, css) {
      if (typeof document === 'undefined') return;
      var tag = getStyle(id);
      if (tag === null) {
        injectStyle(id, css);
        return;
      }
      tag.textContent = css;
    }
    function removeStyle(id) {
      var tag = getStyle(id);
      if (tag !== null) tag.remove();
    }

    /** CSS that folds the thinking rows; empty string means "leave them native". */
    function thinkCss(collapse) {
      return collapse ? '[data-variant="think"]{display:none!important}' : '';
    }

    // ---------------------------------------------------------------------
    // Activity accounting
    // ---------------------------------------------------------------------
    /**
     * Fold the session's finalized nodes, the streaming partial assistant, and
     * the in-flight tool calls into { counts, active } for the four buckets.
     *
     * Think counts finalized reasoning blocks (assistant nodes) plus any
     * reasoning block currently streaming (partial). Tools count settled
     * results (tool-result nodes) plus in-flight calls (runningCalls) — a call
     * is in exactly one of those two places, so nothing is double-counted.
     */
    function computeActivity(nodes, partial, runningCalls) {
      var counts = { think: 0, edit: 0, bash: 0, read: 0 };
      var active = { think: false, edit: false, bash: false, read: false };

      var list = nodes || [];
      for (var i = 0; i < list.length; i++) {
        var node = list[i];
        if (!node) continue;
        if (node.kind === 'assistant' && node.blocks) {
          for (var j = 0; j < node.blocks.length; j++) {
            var block = node.blocks[j];
            if (block && block.kind === 'reasoning') counts.think += 1;
          }
        } else if (node.kind === 'tool-result') {
          var cls = classifyTool(node.call ? node.call.name : null);
          if (cls) counts[cls] += 1;
        }
      }

      if (partial && partial.blocks) {
        for (var k = 0; k < partial.blocks.length; k++) {
          var pblock = partial.blocks[k];
          if (pblock && pblock.kind === 'reasoning') {
            counts.think += 1;
            active.think = true;
          }
        }
      }

      var calls = runningCalls || [];
      for (var m = 0; m < calls.length; m++) {
        var ccls = classifyTool(calls[m] ? calls[m].name : null);
        if (ccls) {
          counts[ccls] += 1;
          active[ccls] = true;
        }
      }

      return { counts: counts, active: active };
    }

    var CHIP_ORDER = ['think', 'edit', 'bash', 'read'];
    var CHIP_META = {
      think: { label: 'Think' },
      edit: { label: 'Edit' },
      bash: { label: 'Bash' },
      read: { label: 'Read' },
    };

    // ---------------------------------------------------------------------
    // Status bar component
    // ---------------------------------------------------------------------
    function SessionStatusBar(props) {
      var useSession = props.useSession;
      var scope = props.scope;

      var settingsSnapshot = React.useSyncExternalStore(
        function (listener) { return scope.subscribe(listener); },
        function () { return scope.getSnapshot(); },
      );
      var settingsValue = settingsSnapshot.value || {};
      var enabled = settingsValue[STATUS_BAR] !== false;

      var nodes = useSession(function (s) { return s.nodes; });
      var partial = useSession(function (s) { return s.partial; });
      var runningCalls = useSession(function (s) { return s.runningCalls; });
      var running = useSession(function (s) { return s.running; });

      var activity = React.useMemo(function () {
        return computeActivity(nodes, partial, runningCalls);
      }, [nodes, partial, runningCalls]);

      var expandedState = React.useState(false);
      var expanded = expandedState[0];
      var setExpanded = expandedState[1];

      if (!enabled) return null;

      var counts = activity.counts;
      var total = counts.think + counts.edit + counts.bash + counts.read;
      if (total === 0 && !running) return null;

      var chips = CHIP_ORDER.map(function (key) {
        var count = counts[key];
        var isActive = activity.active[key];
        return React.createElement('span', {
          key: key,
          className: 'dsm-chip dsm-chip-' + key + (isActive ? ' dsm-chip-active' : '') + (count === 0 ? ' dsm-chip-zero' : ''),
          'data-dsm-cat': key,
          title: CHIP_META[key].label,
        }, [
          React.createElement('span', { key: 'dot', className: 'dsm-dot', 'aria-hidden': true }),
          React.createElement('span', { key: 'label', className: 'dsm-chip-label' }, CHIP_META[key].label),
          React.createElement('span', { key: 'count', className: 'dsm-chip-count' }, String(count)),
        ]);
      });

      var runDot = running
        ? React.createElement('span', { key: 'run', className: 'dsm-run', 'aria-hidden': true })
        : null;

      var toggleChildren = [runDot, React.createElement('span', { key: 'chips', className: 'dsm-chips' }, chips)];
      if (!running) {
        toggleChildren.push(React.createElement('span', {
          key: 'chevron',
          className: 'dsm-chevron' + (expanded ? ' dsm-chevron-open' : ''),
          'aria-hidden': true,
        }));
      }

      var panel = expanded
        ? React.createElement('div', { key: 'panel', className: 'dsm-panel' },
            CHIP_ORDER.map(function (key) {
              var count = counts[key];
              var isActive = activity.active[key];
              return React.createElement('div', {
                key: key,
                className: 'dsm-row' + (isActive ? ' dsm-row-active' : ''),
              }, [
                React.createElement('span', { key: 'dot', className: 'dsm-dot dsm-dot-' + key, 'aria-hidden': true }),
                React.createElement('span', { key: 'label', className: 'dsm-row-label' }, CHIP_META[key].label),
                React.createElement('span', { key: 'count', className: 'dsm-row-count' }, count === 0 ? '\u2014' : String(count)),
                isActive ? React.createElement('span', { key: 'state', className: 'dsm-row-state' }, 'running') : null,
              ]);
            }))
        : null;

      return React.createElement('div', { className: 'dsm-bar', 'data-dsm-statusbar': '' }, [
        React.createElement('button', {
          key: 'toggle',
          type: 'button',
          className: 'dsm-toggle',
          'aria-expanded': expanded,
          'aria-label': expanded ? 'Collapse session activity' : 'Expand session activity',
          title: 'Session activity \u00b7 Think / Edit / Bash / Read',
          onClick: function () { setExpanded(!expanded); },
        }, toggleChildren),
        panel,
      ]);
    }

    // ---------------------------------------------------------------------
    // Plugin body
    // ---------------------------------------------------------------------
    var inject = ['slots', 'settingsScope'];

    function apply(ctx) {
      // Durable settings scope (namespace registered by the node half).
      var scope = ctx.settingsScope.bind({ namespace: NS });

      // Inject the status-bar styles once.
      injectStyle(BAR_CSS_ID, BAR_CSS);

      // Follow the settings scope: fold/unfold thinking on every change, and
      // once immediately so the default holds while settings are loading.
      var applyThink = function () {
        var snap = scope.getSnapshot();
        var v = snap.value || {};
        var collapse = v[COLLAPSE_THINKING] !== false;
        var css = thinkCss(collapse);
        if (css) setStyleText(THINK_CSS_ID, css);
        else removeStyle(THINK_CSS_ID);
      };
      scope.subscribe(applyThink);
      applyThink();

      // Register the collapsible status bar above the composer.
      ctx.slots.inject('conversation.input.dock', function () {
        return ctx.slots.register(
          {
            name: 'conversation.input.dock',
            id: 'dsh-session-manage',
            order: 15,
            inject: function () { return { scope: scope }; },
          },
          SessionStatusBar,
        );
      });

      // Remove injected styles on dispose.
      ctx.effect(function () {
        return function () {
          removeStyle(BAR_CSS_ID);
          removeStyle(THINK_CSS_ID);
        };
      }, 'dsh-session-manage: style cleanup');
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  },
});
