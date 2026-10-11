// Random ids. Group ids double as the "secret" in share links, so they are long.
export function uid(len = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export const groupId = () => uid(16);
