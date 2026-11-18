import { ForbiddenPage, type PageProps } from '@pdfe/web-kit';

export default function Page(props: PageProps) {
  return <ForbiddenPage app="business" {...props} />;
}
