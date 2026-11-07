/**
 * The single navigation exit: replaces the current page or opens a new tab according to settings.
 * @param newTab Open in a new tab when true
 */
export const navigateTo = (url: string, newTab: boolean) => {
  if (newTab) {
    window.open(url, "_blank", "noopener");
  } else {
    window.location.href = url;
  }
};
