-- supabase/migrations/YYYYMMDDHHMMSS_create_coupons_rpc.sql

create or replace function get_coupons_with_course_titles()
returns table (
    id uuid,
    code text,
    discount_type text,
    discount_value numeric,
    max_uses integer,
    used_count integer,
    course_ids uuid[],
    payment_methods text[],
    expires_at timestamptz,
    is_active boolean,
    created_at timestamptz,
    course_titles text[]
) as $$
begin
  return query
  select
    c.id,
    c.code,
    c.discount_type,
    c.discount_value,
    c.max_uses,
    c.used_count,
    c.course_ids,
    c.payment_methods,
    c.expires_at,
    c.is_active,
    c.created_at,
    array(
        select co.title
        from courses co
        where co.id = any(c.course_ids)
    ) as course_titles
  from
    discount_coupons c
  order by
    c.created_at desc;
end;
$$ language plpgsql;
