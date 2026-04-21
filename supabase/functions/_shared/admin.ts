// Shared admin email allowlist for all admin edge functions.
export const ADMIN_EMAILS = [
  "mailsmartcodes@gmail.com",
  "smartegbuchulem@gmail.com",
  "smartucheegbuchulem@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
