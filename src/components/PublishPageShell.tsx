
type PublishPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export const inputClassName =
  "hub-input";

export const labelClassName =
  "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function PublishPageShell({
  title,
  description,
  children,
}: PublishPageShellProps) {
  return (
      <div className="hub-page">
      <main className="hub-container max-w-5xl py-10 sm:py-14">
        <div className="mb-10">
          <h1 className="hub-page-heading">
            {title}
          </h1>
          <p className="mt-3 hub-muted">{description}</p>
        </div>

        {children}
      </main>
    </div>
  );
}
