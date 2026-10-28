"use client";
import { useRouter } from "next/navigation";
export function LeadTableRow({
  href,
  test,
  children,
}: {
  href: string;
  test: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className={test ? "sc-admin-testrow" : undefined}
      onClick={(e) => {
        if (
          !(e.target as HTMLElement).closest("a,button,input,select,textarea")
        )
          router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
