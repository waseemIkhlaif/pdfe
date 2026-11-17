/**
 * Unthemed sign-in (the navigable-shells story styles it and adds the translated label from @pdfe/i18n).
 * The link starts the OIDC flow in the route handler, which keeps every token on the server.
 */
export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main data-testid="sign-in">
      <a
        data-testid="sign-in-link"
        href={`/api/auth/sign-in?returnTo=${encodeURIComponent(`/${locale}`)}`}
      />
    </main>
  );
}
