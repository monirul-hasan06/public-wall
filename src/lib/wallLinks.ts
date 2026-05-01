export function getWallPath(username: string) {
  return `/u/${encodeURIComponent(username.trim().toLowerCase())}`;
}

export function getWallShareUrl(username: string) {
  const safeUsername = encodeURIComponent(username.trim().toLowerCase());
  return `${window.location.origin}/?wall=${safeUsername}`;
}
