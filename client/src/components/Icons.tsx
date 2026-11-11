import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function UploadCloudIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v2.25A2.25 2.25 0 0 0 7.25 19h9.5A2.25 2.25 0 0 0 19 16.75V14.5" /></Icon>;
}

export function FileTextIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.5 3.75h7l4 4v12.5h-11zM13.5 3.75v4h4M9 12h6M9 15.5h6" /></Icon>;
}

export function FileArchiveIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.5 3.75h8l3 3v13.5h-11zM14.5 3.75v3h3M10 8h1m-1 2h1m-1 2h1m-1 2h1m-1 2h1" /></Icon>;
}

export function AlertTriangleIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m12 4 8 15H4zM12 9v4m0 3h.01" /></Icon>;
}

export function CheckCircleIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m8.5 12 2.25 2.25L15.75 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Icon>;
}

export function MoonIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></Icon>;
}

export function SunIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.7-.7M6.34 6.34l-.7-.7m12.72 0-.7.7m-11.32 11.32-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></Icon>;
}

export function BookOpenIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3.5 5.5c2-1 4.5-1 8.5.75V20c-4-1.75-6.5-1.75-8.5-.75zM20.5 5.5c-2-1-4.5-1-8.5.75V20c4-1.75 6.5-1.75 8.5-.75z" /></Icon>;
}

export function ChevronDownIcon(props: IconProps) {
  return <Icon {...props}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" /></Icon>;
}
