-- supabase/migrations/YYYYMMDDHHMMSS_create_marketing_rpc.sql

-- Function to get all distinct tags from the leads table
-- This is much more efficient than fetching all leads and processing in the client
create or replace function get_distinct_lead_tags()
returns text[] as $$
begin
  return array(
    select distinct unnest(tags)
    from public.leads
    where tags is not null and tags <> '{}'
    order by 1
  );
end;
$$ language plpgsql stable;

-- Function to get all distinct sources from the leads table
create or replace function get_distinct_lead_sources()
returns text[] as $$
begin
  return array(
    select distinct source
    from public.leads
    where source is not null and source <> ''
    order by 1
  );
end;
$$ language plpgsql stable;
