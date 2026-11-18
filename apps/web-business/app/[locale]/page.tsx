import { HomePage, type PageProps } from '@pdfe/web-kit';

export default function Page(props: PageProps) {
  return <HomePage app="business" {...props} />;
}
