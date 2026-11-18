import { ErrorPage, type PageProps } from '@pdfe/web-kit';

export default function Page(props: PageProps) {
  return <ErrorPage app="devportal" {...props} />;
}
