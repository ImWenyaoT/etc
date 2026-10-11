import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon } from "lucide-react";
export function ToolLayout({
  brand,
  index,
  eyebrow,
  title,
  description,
  footer,
  children,
}: {
  brand: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between border-b pb-6 text-xs font-semibold tracking-widest">
        {brand}
        <span className="font-normal tracking-normal text-muted-foreground">
          {index}
        </span>
      </header>
      <section className="max-w-3xl py-8 md:py-12">
        <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mb-4 text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </section>
      {children}
      <footer className="mt-8 text-xs leading-6 text-muted-foreground">
        {footer}
      </footer>
    </main>
  );
}
export function Workspace({
  children,
  editor = false,
}: {
  children: ReactNode;
  editor?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-6",
        editor ? "md:grid-cols-2" : "md:grid-cols-[300px_minmax(0,1fr)]",
      )}
    >
      {children}
    </div>
  );
}
export function TaskError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
export function TaskEmpty({
  title,
  description,
  loading = false,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {loading ? <Spinner /> : <SearchIcon />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
