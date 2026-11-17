/**
 * Stacking order of the shell. The simulation banner is above everything a page can open (dialogs, menus, toasts,
 * which Radix mounts in the portal container), so no overlay can cover the label. Both values are also set as CSS
 * custom properties on the root by SimShell.
 */
export const Z_PORTAL = 900;
export const Z_BANNER = 1000;
