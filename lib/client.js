/**
 * dsh-session-state — client half.
 *
 * Browser bundle loaded by the client module loader. It:
 *   1. binds the durable `dsh-session-state` settings scope,
 *   2. folds the assistant thinking rows (while `collapseThinking` is enabled)
 *      and the tool-call content rows — Bash/Edit/Read/… (while `collapseTools`
 *      is enabled) so the answer renders directly,
 *   3. registers a collapsible session-activity status bar on the
 *      `conversation.input.dock` seat (the row above the composer card),
 *      aligned with the input box; expanded, it lists the actual content of
 *      every Think / Edit / Bash / Read activity in scrollable, foldable
 *      sections (not just counts).
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-state',
  factory: (require) => {
    'use strict';
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var React = require('react');

    // ---------------------------------------------------------------------
    // Constants (keep in sync with lib/index.js and dsh.plugin.json)
    // ---------------------------------------------------------------------
    var NS = 'dsh-session-state';
    var COLLAPSE_THINKING = 'collapseThinking';
    var COLLAPSE_TOOLS = 'collapseTools';
    var STATUS_BAR = 'statusBar';

    var BAR_CSS_ID = 'dsh-session-state/statusbar';
    var FOLD_CSS_ID = 'dsh-session-state/fold';

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
    // Content summaries (for the expanded panel)
    // ---------------------------------------------------------------------
    function firstLine(text) {
      var s = String(text == null ? '' : text);
      var nl = s.indexOf('\n');
      return nl === -1 ? s : s.slice(0, nl);
    }

    /** One-line preview of a text blob (used for reasoning blocks). */
    function summarizeText(text) {
      var s = String(text == null ? '' : text).trim();
      if (s === '') return '';
      var first = firstLine(s).trim() || s;
      if (first.length > 140) first = first.slice(0, 137) + '\u2026';
      return first;
    }

    /** Preferred arg keys for a tool's one-line summary (mirrors the native tool UI). */
    var SUMMARY_KEYS = {
      bash: ['command', 'description'],
      pwsh: ['command', 'description'],
      edit: ['path', 'file_path'],
      write: ['path', 'file_path'],
      read: ['path', 'file_path', 'url'],
      web_fetch: ['url'],
      web_search: ['query', 'url'],
      grep: ['pattern', 'query'],
      glob: ['pattern'],
      cordis_package_inspect: ['name'],
      cordis_runtime_inspect: ['name'],
    };

    /** One-line preview of a tool call from its raw JSON args. */
    function summarizeToolArgs(name, argsRaw) {
      var raw = String(argsRaw == null ? '' : argsRaw);
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (parsed && typeof parsed === 'object') {
        var keys = SUMMARY_KEYS[name] || null;
        if (keys) {
          for (var i = 0; i < keys.length; i++) {
            var v = parsed[keys[i]];
            if (typeof v === 'string' && v !== '') return summarizeText(v);
          }
        }
        for (var k in parsed) {
          var val = parsed[k];
          if (typeof val === 'string' && val !== '') return summarizeText(val);
        }
      }
      return summarizeText(raw);
    }

    // ---------------------------------------------------------------------
    // CSS
    // ---------------------------------------------------------------------
    var BAR_CSS = [
      // Expanded state spans the input box's full box (JS-measured margin-left
      // + width pin the bar to the card's box; the toggle and panel are flush
      // with both edges). COLLAPSED state is a compact pill (natural width,
      // no full-width empty strip) so the session content has no scroll
      // whitespace. `--dsh-composer-card-max-width` cannot be trusted here
      // because other plugins (e.g. dsh-width) override it.
      '.dsm-bar{box-sizing:border-box;width:100%;margin-left:0;margin-right:auto;display:flex;flex-direction:column;align-items:stretch;flex:none}',
      '.dsm-toggle{display:flex;align-items:center;justify-content:flex-start;gap:6px;width:auto;align-self:flex-start;min-height:24px;padding:2px 10px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer;text-align:left}',
      '.dsm-bar[data-expanded="true"] .dsm-toggle{width:100%;align-self:stretch;justify-content:space-between;border-radius:10px}',
      '.dsm-toggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dsm-toggle:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary);outline-offset:-2px}',
      '.dsm-left{display:inline-flex;align-items:center;gap:6px;min-width:0}',
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
      '@media (prefers-reduced-motion:reduce){.dsm-run,.dsm-chip-active .dsm-dot,.dsm-item-running .dsm-item-dot{animation:none}}',
      '.dsm-chevron{width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid var(--dsw-alias-label-secondary);transition:transform .15s;flex:none}',
      '.dsm-chevron-open{transform:rotate(180deg)}',
      // Expanded panel: content sections, whole panel scrolls.
      '.dsm-panel{margin-top:2px;padding:4px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);border-radius:12px;display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto}',
      '.dsm-section{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);overflow:hidden;flex:none}',
      '.dsm-section-head{display:flex;align-items:center;gap:8px;width:100%;padding:4px 8px;border:none;background:transparent;cursor:pointer;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.dsm-section-head:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsm-section-head:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary);outline-offset:-2px}',
      '.dsm-section-label{font-weight:500;flex:1;min-width:0}',
      '.dsm-section-count{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dsm-section-state{font-size:11px;color:var(--dsw-alias-state-business-primary)}',
      '.dsm-section-chevron{width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid var(--dsw-alias-label-secondary);transition:transform .15s;flex:none}',
      '.dsm-section-chevron-open{transform:rotate(180deg)}',
      '.dsm-section-body{display:flex;flex-direction:column;gap:1px;border-top:1px solid var(--dsw-alias-border-l1);padding:4px 8px 6px}',
      '.dsm-item{display:flex;gap:6px;align-items:center;min-width:0;padding:2px 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsm-item-running{color:var(--dsw-alias-label-primary)}',
      '.dsm-item-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-caption);flex:none}',
      '.dsm-item-running .dsm-item-dot{background:var(--dsw-alias-state-business-primary);animation:1s ease-in-out infinite dsm-pulse}',
      '.dsm-item-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
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
      tag.dataset.plugin = 'dsh-session-state';
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

    /**
     * CSS that folds the process rows inside the chat flow; empty string means
     * "leave them native". Scoped to `[data-chat-flow]` so the details panel
     * and other surfaces that reuse the same variant markers are untouched.
     */
    function foldCss(collapseThinking, collapseTools) {
      var parts = [];
      if (collapseThinking) parts.push('[data-chat-flow] [data-variant="think"]');
      if (collapseTools) {
        parts.push(
          '[data-chat-flow] [data-variant="bash"]',
          '[data-chat-flow] [data-variant="edit"]',
          '[data-chat-flow] [data-variant="write"]',
          '[data-chat-flow] [data-variant="read"]',
          '[data-chat-flow] [data-variant="search"]',
          '[data-chat-flow] [data-variant="code"]',
        );
      }
      if (parts.length === 0) return '';
      return parts.join(',') + '{display:none!important}';
    }

    // ---------------------------------------------------------------------
    // Activity accounting (counts + per-item content)
    // ---------------------------------------------------------------------
    /**
     * Fold the session's finalized nodes, the streaming partial assistant, and
     * the in-flight tool calls into { counts, active, items } for the four
     * buckets. Think counts finalized reasoning blocks (assistant nodes) plus
     * any reasoning block currently streaming (partial). Tools count settled
     * results (tool-result nodes) plus in-flight calls (runningCalls) — a call
     * is in exactly one of those two places, so nothing is double-counted.
     */
    function computeActivity(nodes, partial, runningCalls) {
      var counts = { think: 0, edit: 0, bash: 0, read: 0 };
      var active = { think: false, edit: false, bash: false, read: false };
      var items = { think: [], edit: [], bash: [], read: [] };
      var i, j, node, block, name, cls;

      var list = nodes || [];
      for (i = 0; i < list.length; i++) {
        node = list[i];
        if (!node) continue;
        if (node.kind === 'assistant' && node.blocks) {
          for (j = 0; j < node.blocks.length; j++) {
            block = node.blocks[j];
            if (block && block.kind === 'reasoning') {
              counts.think += 1;
              items.think.push({ text: summarizeText(block.text), running: false });
            }
          }
        } else if (node.kind === 'tool-result') {
          name = node.call ? node.call.name : null;
          cls = classifyTool(name);
          if (cls) {
            counts[cls] += 1;
            items[cls].push({ text: summarizeToolArgs(name, node.call ? node.call.argsRaw : null), running: false });
          }
        }
      }

      if (partial && partial.blocks) {
        for (j = 0; j < partial.blocks.length; j++) {
          block = partial.blocks[j];
          if (block && block.kind === 'reasoning') {
            counts.think += 1;
            active.think = true;
            items.think.push({ text: summarizeText(block.text), running: true });
          }
        }
      }

      var calls = runningCalls || [];
      for (j = 0; j < calls.length; j++) {
        var call = calls[j];
        cls = classifyTool(call ? call.name : null);
        if (cls) {
          counts[cls] += 1;
          active[cls] = true;
          items[cls].push({ text: summarizeToolArgs(call ? call.name : null, call ? call.argsRaw : null), running: true });
        }
      }

      return { counts: counts, active: active, items: items };
    }

    var CHIP_ORDER = ['think', 'edit', 'bash', 'read'];
    var CHIP_META = {
      think: { label: 'Think' },
      edit: { label: 'Edit' },
      bash: { label: 'Bash' },
      read: { label: 'Read' },
    };
    var EMPTY_ITEMS = { think: [], edit: [], bash: [], read: [] };

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

      var foldedState = React.useState({ think: false, edit: false, bash: false, read: false });
      var folded = foldedState[0];
      var setFolded = foldedState[1];

      var counts = activity.counts;
      var items = activity.items || EMPTY_ITEMS;
      var total = counts.think + counts.edit + counts.bash + counts.read;

      // Keep the toolbar's left edge (and width) aligned with the actual input
      // box ([data-composer-card]). The card's position/width are measured at
      // runtime because `--dsh-composer-card-max-width` can be overridden by
      // other plugins (dsh-width) and no pure-CSS formula survives that. The
      // effect re-runs when the bar becomes visible (it renders nothing while
      // idle, so a mount-only effect would miss the first visible frame).
      //
      // IMPORTANT: measure against `[data-composer-seat]`, NOT
      // `bar.parentElement` — the slot renderer wraps every outlet in a
      // `<div data-slot=… style="display:contents">` (dsh-client-web-react),
      // and `getBoundingClientRect()` on a display:contents element returns
      // all zeros, which would push the bar off by the card's screen offset.
      var visible = enabled && (total > 0 || running);
      var barRef = React.useRef(null);
      React.useLayoutEffect(function () {
        if (!visible) return undefined;
        var bar = barRef.current;
        if (bar === null) return undefined;
        if (typeof document === 'undefined') return undefined;
        var seat = bar.closest('[data-composer-seat]');
        var card = seat === null ? null : seat.querySelector('[data-composer-card]');
        if (card === null || seat === null) return undefined;

        var align = function () {
          var cardRect = card.getBoundingClientRect();
          var seatRect = seat.getBoundingClientRect();
          var left = Math.max(0, Math.round(cardRect.left - seatRect.left));
          var width = Math.round(cardRect.width);
          if (bar.style.marginLeft !== left + 'px') bar.style.marginLeft = left + 'px';
          if (bar.style.width !== width + 'px') bar.style.width = width + 'px';
        };
        align();

        var disposers = [];
        // One retry shortly after mount in case the first frame's layout was
        // not final (fonts/images can shift the card after commit).
        var retry = typeof setTimeout !== 'undefined' ? setTimeout(align, 80) : 0;
        disposers.push(function () { if (retry !== 0) clearTimeout(retry); });
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('resize', align);
          disposers.push(function () { window.removeEventListener('resize', align); });
        }
        if (typeof ResizeObserver !== 'undefined') {
          var observer = new ResizeObserver(align);
          observer.observe(card);
          observer.observe(seat);
          disposers.push(function () { observer.disconnect(); });
        }
        return function () {
          for (var i = 0; i < disposers.length; i++) disposers[i]();
        };
      }, [visible]);

      if (!enabled) return null;
      if (total === 0 && !running) return null;

      var toggleSection = function (key) {
        setFolded(function (prev) {
          var next = {};
          for (var k in prev) next[k] = prev[k];
          next[key] = !prev[key];
          return next;
        });
      };

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

      var panel = expanded
        ? React.createElement('div', { key: 'panel', className: 'dsm-panel', role: 'region' },
            CHIP_ORDER.map(function (key) {
              var label = CHIP_META[key].label;
              var count = counts[key];
              var isActive = activity.active[key];
              var list = items[key] || [];
              var isFolded = folded[key] === true;

              var body = null;
              if (!isFolded) {
                var rows = list.length === 0
                  ? [React.createElement('div', { key: 'empty', className: 'dsm-item' }, [
                      React.createElement('span', { key: 'dot', className: 'dsm-item-dot', 'aria-hidden': true }),
                      React.createElement('span', { key: 'text', className: 'dsm-item-text' }, '\u2014'),
                    ])]
                  : list.map(function (item, idx) {
                      return React.createElement('div', {
                        key: idx,
                        className: 'dsm-item' + (item.running ? ' dsm-item-running' : ''),
                        title: item.text,
                      }, [
                        React.createElement('span', { key: 'dot', className: 'dsm-item-dot', 'aria-hidden': true }),
                        React.createElement('span', { key: 'text', className: 'dsm-item-text' }, item.text || '\u2014'),
                      ]);
                    });
                body = React.createElement('div', { key: 'body', className: 'dsm-section-body' }, rows);
              }

              return React.createElement('div', { key: key, className: 'dsm-section' }, [
                React.createElement('button', {
                  key: 'head',
                  type: 'button',
                  className: 'dsm-section-head',
                  'aria-expanded': !isFolded,
                  onClick: function () { toggleSection(key); },
                }, [
                  React.createElement('span', { key: 'dot', className: 'dsm-dot dsm-dot-' + key, 'aria-hidden': true }),
                  React.createElement('span', { key: 'label', className: 'dsm-section-label' }, label),
                  React.createElement('span', { key: 'count', className: 'dsm-section-count' }, String(count)),
                  isActive ? React.createElement('span', { key: 'state', className: 'dsm-section-state' }, 'running') : null,
                  React.createElement('span', {
                    key: 'chevron',
                    className: 'dsm-section-chevron' + (isFolded ? '' : ' dsm-section-chevron-open'),
                    'aria-hidden': true,
                  }),
                ]),
                body,
              ]);
            }))
        : null;

      return React.createElement('div', { ref: barRef, className: 'dsm-bar', 'data-dsm-statusbar': '', 'data-expanded': expanded }, [
        React.createElement('button', {
          key: 'toggle',
          type: 'button',
          className: 'dsm-toggle',
          'aria-expanded': expanded,
          'aria-label': expanded ? 'Collapse session activity' : 'Expand session activity',
          title: 'Session activity \u00b7 Think / Edit / Bash / Read',
          onClick: function () { setExpanded(!expanded); },
        }, [React.createElement('span', { key: 'left', className: 'dsm-left' }, [runDot, React.createElement('span', { key: 'chips', className: 'dsm-chips' }, chips)]), React.createElement('span', {
          key: 'chevron',
          className: 'dsm-chevron' + (expanded ? ' dsm-chevron-open' : ''),
          'aria-hidden': true,
        })]),
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

      // Follow the settings scope: fold/unfold thinking + tool rows on every
      // change, and once immediately so the defaults hold while loading.
      var applyFold = function () {
        var snap = scope.getSnapshot();
        var v = snap.value || {};
        var think = v[COLLAPSE_THINKING] !== false;
        var tools = v[COLLAPSE_TOOLS] !== false;
        var css = foldCss(think, tools);
        if (css) setStyleText(FOLD_CSS_ID, css);
        else removeStyle(FOLD_CSS_ID);
      };
      scope.subscribe(applyFold);
      applyFold();

      // Register the collapsible status bar above the composer.
      ctx.slots.inject('conversation.input.dock', function () {
        return ctx.slots.register(
          {
            name: 'conversation.input.dock',
            id: 'dsh-session-state',
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
          removeStyle(FOLD_CSS_ID);
        };
      }, 'dsh-session-state: style cleanup');
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  },
});
