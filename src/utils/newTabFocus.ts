/**
 * Experimental "focus search on new tab" (setting `focusOnNewTab`, off by default).
 *
 * Browsers keep keyboard focus in the address bar on extension new tab pages, and a page can't take it.
 * A page that reloads itself does get focus, so on a new tab this replaces the page once with
 * `index.html?focus` (`location.replace`, so Back history doesn't grow). The cost: the address bar
 * shows the extension's address instead of staying empty, and the page loads twice.
 */

const FOCUS_FLAG = "focus";

/** Reopen the page once to take focus; returns true if it did, so the caller skips mounting */
export const reopenForFocus = (): boolean => {
  // Only inside the extension (not the dev server or a normal web page), and only once per tab
  if (!location.protocol.endsWith("-extension:")) return false;
  if (new URLSearchParams(location.search).has(FOCUS_FLAG)) return false;
  location.replace(`${location.pathname}?${FOCUS_FLAG}`);
  return true;
};
