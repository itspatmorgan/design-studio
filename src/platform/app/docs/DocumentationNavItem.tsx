import type { ReactNode } from 'react';
import FileNavItem from '@/platform/app/shell/FileNavItem';
import { documentationRequest } from './documentationSource';

export default function DocumentationNavItem(props: {
  href: string;
  path: string;
  label: string;
  nested?: boolean;
  icon?: ReactNode;
  detail?: string;
}) {
  return <FileNavItem {...props} reveal={() => documentationRequest('reveal', props.path)} />;
}
