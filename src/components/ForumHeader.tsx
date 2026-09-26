import Link from "next/link";
import AuthControls from "@/components/AuthControls";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function ForumHeader() {
  return <header className="site-header">
    <div className="site-header-inner">
      <Link href="/" className="site-brand" aria-label="SkillHub 首页"><span className="site-brand-mark">S</span><span className="site-brand-name">SkillHub</span></Link>
      <nav className="site-nav" aria-label="主导航">
        <Link href="/skills" className="site-nav-link">Skills</Link>
        <Link href="/forum" className="site-nav-link">论坛</Link>
        <Link href="/knowledge" className="site-nav-link">知识库</Link>
        <Link href="/collections" className="site-nav-link">专题</Link>
        <Link href="/notifications" className="site-nav-link">通知</Link>
      </nav>
      <div className="site-header-tools"><CreateMenu /><ThemeToggle /><AuthControls /></div>
    </div>
  </header>;
}
