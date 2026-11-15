"use client";

import { useState } from "react";
import { StatusPill } from "@/components/ui";
import type { AppUser } from "@/lib/data/settings";

// TODO(backend): call setUserRole (server action, admins only) and refresh. Until
// sign-in lands this only changes the screen, which the page banner says.
export function UsersTable({ users: initial }: { users: AppUser[] }) {
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const visible = users.filter((u) => !q || [u.name, u.email, u.campus ?? ""].some((v) => v.toLowerCase().includes(q)));
  const toggle = (id: string) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role: u.role === "iahv_admin" ? "organizer" : "iahv_admin" } : u)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor="u-search" className="text-[13px] font-semibold">Find a person</label>
        <input
          id="u-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email or campus"
          className="min-h-11 rounded-[10px] border border-field bg-white px-3.5 text-[15px] text-ink"
        />
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-ink-soft">
              <th scope="col" className="px-4 py-3 font-bold">Name</th>
              <th scope="col" className="px-2 py-3 font-bold">Email</th>
              <th scope="col" className="px-2 py-3 font-bold">Campus</th>
              <th scope="col" className="px-2 py-3 font-bold">Role</th>
              <th scope="col" className="py-3 pr-4 pl-2 text-right font-bold"><span className="sr-only">Change role</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-t border-line-3">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-2 py-3">{u.email}</td>
                <td className="px-2 py-3 text-muted">{u.campus ?? "—"}</td>
                <td className="px-2 py-3">
                  <StatusPill tone={u.role === "iahv_admin" ? "info" : "ok"}>{u.role === "iahv_admin" ? "IAHV admin" : "Organizer"}</StatusPill>
                </td>
                <td className="py-3 pr-4 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => toggle(u.id)}
                    className="min-h-10 cursor-pointer rounded-[10px] border border-field px-3.5 font-semibold whitespace-nowrap text-brand-dark hover:bg-surface"
                  >
                    {u.role === "iahv_admin" ? "Make organizer" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">No one matches “{search}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
