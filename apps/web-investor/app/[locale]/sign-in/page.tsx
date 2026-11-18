import { SignInPage, type PageProps } from '@pdfe/web-kit';

export default function Page(props: PageProps) {
  return <SignInPage app="investor" {...props} />;
}
