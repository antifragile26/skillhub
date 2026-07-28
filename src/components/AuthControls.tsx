"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfileDisplay } from "@/lib/profile";

type AuthUser = {
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    username?: string | null;
  } | null;
};

export default function AuthControls() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as AuthUser | null);
      setIsLoaded(true);
    }

    void loadUser();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as AuthUser | null);
      setIsLoaded(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function switchAccount() {
    setIsSwitching(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!isLoaded) {
    return <span className="h-8 w-24" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white">
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-green-600 px-4 py-1.5 font-medium text-white hover:bg-green-500"
        >
          注册
        </Link>
      </>
    );
  }

  const profile = getProfileDisplay(user);

  return (
    <>
      <Link
        href="/me"
        className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-white"
        title={`进入 ${profile.name} 的个人页`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {profile.initial}
        </span>
        <span>我的</span>
      </Link>
      <button
        type="button"
        onClick={switchAccount}
        disabled={isSwitching}
        className="text-zinc-500 hover:text-zinc-900 disabled:cursor-wait disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
      >
        切换账号
      </button>
    </>
  );
}
