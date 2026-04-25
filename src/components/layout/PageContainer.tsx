import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
  spacingClassName?: string;
};

export default function PageContainer({
  children,
  className,
  maxWidthClassName = "max-w-7xl",
  spacingClassName = "space-y-8",
}: PageContainerProps) {
  const classes = ["mx-auto w-full p-6", maxWidthClassName, spacingClassName, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}