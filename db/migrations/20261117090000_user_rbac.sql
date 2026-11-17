-- New accounts are read-only. Preserve one existing operator as the first admin.
ALTER TABLE public.users
  ADD COLUMN role text NOT NULL DEFAULT 'viewer',
  ADD COLUMN token_version integer NOT NULL DEFAULT 0;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'viewer'));
UPDATE public.users SET role = 'admin'
WHERE user_id = (SELECT user_id FROM public.users WHERE is_active = TRUE ORDER BY user_id LIMIT 1);
CREATE TABLE public.user_access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  target_id text NOT NULL,
  action text NOT NULL,
  old_access jsonb,
  new_access jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
