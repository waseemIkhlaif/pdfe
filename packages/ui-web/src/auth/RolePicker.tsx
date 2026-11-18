export interface RoleChoice {
  /** The demo user to sign in as: passed to the sign-in as `login_hint`, so the hosted page starts with that user. */
  username: string;
  title: string;
  body: string;
}

/**
 * The demo role picker (CON-004): the person choosing a role inside a simulation. Choosing one starts the sign-in with that
 * demo user's name already filled in (`login_hint`); the password and, for privileged roles, the one-time code are still
 * asked on the hosted page. These are synthetic accounts, so the page can name them; nothing here grants anything.
 */
export function RolePicker({
  heading,
  roles,
  signInHref,
}: {
  heading: string;
  roles: RoleChoice[];
  /** Builds the URL of the sign-in route handler for one demo user. */
  signInHref: (username: string) => string;
}) {
  return (
    <section aria-labelledby="role-picker-heading" data-testid="role-picker">
      <h2 className="block-title" id="role-picker-heading">
        {heading}
      </h2>
      <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
        {roles.map((r) => (
          <a
            key={r.username}
            className="card"
            href={signInHref(r.username)}
            data-testid={`role-${r.username}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <strong>{r.title}</strong>
            <div className="muted">{r.body}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
