
type PublishPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-100 dark:placeholder-zinc-500";

export const labelClassName =
  "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function PublishPageShell({
  title,
  description,
  children,
}: PublishPageShellProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
      <main className="mx-auto max-w-5xl px-8 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>

        {children}
      </main>
    </div>
  );
}
