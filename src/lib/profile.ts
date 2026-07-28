type ProfileSource = {
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    username?: string | null;
  } | null;
};

export function getProfileDisplay(user: ProfileSource) {
  const name =
    user.user_metadata?.display_name?.trim() ||
    user.user_metadata?.username?.trim() ||
    user.email?.split("@")[0] ||
    "用户";

  return {
    name,
    initial: name.charAt(0).toUpperCase(),
  };
}
