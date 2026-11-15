-- Client privacy (DECISIONS.md 001). Owner: Engineer A (Aryan).
--
-- clients hold a university's billing contact (Attn name, address, AP email). Sign-in is
-- open to any Google account, so "every signed-in user can read every client" exposed
-- those contacts to anyone. Now a client is visible to IAHV admins, the organizer who
-- created it, and organizers with a course billed to it.

drop policy "clients: read" on public.clients;

create policy "clients: read own, used or admin" on public.clients for select to authenticated
  using (
    public.is_iahv_admin()
    or created_by = (select auth.uid())
    or exists (
      select 1 from public.courses c
      where c.client_id = clients.id and c.organizer_id = (select auth.uid())
    )
  );
