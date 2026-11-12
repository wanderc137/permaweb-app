import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/auth";
import Brand from "./Brand";
import IdleLogout from "./IdleLogout";
import LogoutButton from "./LogoutButton";

export default async function Topbar({ children }: { children?: ReactNode }) {
  const user = await currentUser();

  return (
    <header className="topbar">
      <Link href="/" className="brand-link" aria-label="Inicio">
        <Brand />
      </Link>
      <div className="topright">
        <Link href="/" className="navbtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10.5 12 4l8 6.5" />
            <path d="M6 9.5V20h12V9.5" />
          </svg>
          Inicio
        </Link>
        {user ? <Link href="/historial" className="navbtn">Historial</Link> : null}
        {user?.role === "admin" ? <Link href="/admin" className="navbtn">Administración</Link> : null}
        {children}
        {user ? <LogoutButton /> : null}
      </div>
      {user ? <IdleLogout /> : null}
    </header>
  );
}
