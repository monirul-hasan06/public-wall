const cleanUsername = (username: string) => encodeURIComponent(username.trim().toLowerCase());

export function getDeyalPath(username: string) {
  return `/deyal/${cleanUsername(username)}`;
}

export function getDeyalDashboardPath(username: string) {
  return `${getDeyalPath(username)}/dashboard`;
}

export function getDeyalShareUrl(username: string) {
  return `${window.location.origin}${getDeyalPath(username)}`;
}

export const getWallPath = getDeyalPath;
export const getWallShareUrl = getDeyalShareUrl;
