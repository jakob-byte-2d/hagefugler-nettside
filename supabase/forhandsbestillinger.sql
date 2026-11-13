-- Bestillingslisten for kortstokken på hagefugler.no (og fuglekort.no).
-- Kjøres i Supabase: SQL Editor → lim inn hele fila → Run. Trygg å kjøre på nytt.
--
-- Versjon 2: én påmelding kan ha begge versjonene (antall_foto og antall_illustrasjoner),
-- og hver versjon har sitt eget mål på 100 kortstokker. Kjøres fila der versjon 1 allerede
-- ligger, flyttes påmeldingene over, og skjemaet fra versjon 1 virker fortsatt i overgangen.
--
-- Versjon 3 (november 2026): skjemaet på hagefugler.no spør ikke lenger om adressen. Den spørres om
-- på e-post når det blir trykk. Kolonnen mangler_adresse i vipps_krav viser hvem du må spørre.
-- Skjemaet på fuglekort.no sender fortsatt adressen, og det virker som før.
--
-- Nettsiden (publishable key, rollen anon) kan bare legge inn påmeldinger og lese tellertallene.
-- Navn, e-post, mobil og adresse kan ikke leses fra nettsiden. Du ser dem i Table Editor (vipps_krav).

create table if not exists public.forhandsbestillinger (
  id                     uuid primary key default gen_random_uuid(),
  opprettet              timestamptz not null default now(),
  navn                   text not null check (char_length(btrim(navn)) between 2 and 100),
  epost                  text not null check (char_length(epost) <= 254 and epost ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mobil                  text not null check (mobil ~ '^[49][0-9]{7}$'),   -- norsk mobilnummer, 8 siffer, uten +47
  antall_foto            int  not null default 0 check (antall_foto between 0 and 20),
  antall_illustrasjoner  int  not null default 0 check (antall_illustrasjoner between 0 and 20),
  antall                 int  check (antall between 1 and 20),                         -- bare skjemaet fra versjon 1
  versjon                text check (versjon in ('foto', 'illustrasjoner')),           -- bare skjemaet fra versjon 1
  levering               text not null check (levering in ('post', 'hent')),
  adresse                text check (adresse is null or char_length(btrim(adresse)) between 3 and 200),
  postnummer             text check (postnummer is null or postnummer ~ '^[0-9]{4}$'),
  poststed               text check (poststed is null or char_length(btrim(poststed)) between 2 and 60),
  samtykke               boolean not null check (samtykke),
  status                 text not null default 'venter' check (status in ('venter', 'betalt', 'sendt', 'trukket')),
  merknad                text,                                                         -- til deg selv, f.eks. «bare foto trykket»
  constraint minst_en_kortstokk check (antall_foto + antall_illustrasjoner >= 1)
);

-- Versjon 3: adressen er ikke lenger påkrevd ved post. Den spørres om når det blir trykk.
alter table public.forhandsbestillinger drop constraint if exists adresse_ved_post;

-- Fra versjon 1 (ett antall og én versjon per påmelding) til antall per versjon
alter table public.forhandsbestillinger
  add column if not exists antall_foto int not null default 0 check (antall_foto between 0 and 20);
alter table public.forhandsbestillinger
  add column if not exists antall_illustrasjoner int not null default 0 check (antall_illustrasjoner between 0 and 20);
alter table public.forhandsbestillinger alter column antall drop not null;
alter table public.forhandsbestillinger alter column versjon drop not null;

update public.forhandsbestillinger
   set antall_foto = case when versjon = 'foto' then antall else 0 end,
       antall_illustrasjoner = case when versjon = 'illustrasjoner' then antall else 0 end
 where antall is not null and antall_foto + antall_illustrasjoner = 0;
update public.forhandsbestillinger set antall = null, versjon = null where antall is not null;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'minst_en_kortstokk' and conrelid = 'public.forhandsbestillinger'::regclass) then
    alter table public.forhandsbestillinger
      add constraint minst_en_kortstokk check (antall_foto + antall_illustrasjoner >= 1);
  end if;
end $$;

comment on table public.forhandsbestillinger is
  'Bestillingslisten på hagefugler.no og fuglekort.no. Mål: 100 kortstokker per versjon. Status: venter → betalt → sendt, eller trukket. Slett påmeldinger som ikke er trykket etter 12 måneder.';

-- Én påmelding per e-post
create unique index if not exists forhandsbestillinger_epost_unik
  on public.forhandsbestillinger (lower(epost));

-- Tilgang: nettsiden får bare legge inn de feltene skjemaet sender
alter table public.forhandsbestillinger enable row level security;
revoke all on public.forhandsbestillinger from anon, authenticated;
grant insert (navn, epost, mobil, antall_foto, antall_illustrasjoner, antall, versjon,
              levering, adresse, postnummer, poststed, samtykke)
  on public.forhandsbestillinger to anon, authenticated;

drop policy if exists "Alle kan melde seg på" on public.forhandsbestillinger;
create policy "Alle kan melde seg på" on public.forhandsbestillinger
  for insert to anon, authenticated
  with check (status = 'venter');

-- Rydder i det som kommer inn: skjemaet fra versjon 1, små bokstaver i e-post,
-- ingen adresse ved henting, og en sperre mot at noen fyller lista med søppel
create or replace function public.forhandsbestilling_inn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.antall is not null then                       -- skjemaet fra versjon 1
    if new.antall_foto + new.antall_illustrasjoner = 0 then
      if new.versjon = 'illustrasjoner' then
        new.antall_illustrasjoner := new.antall;
      else
        new.antall_foto := new.antall;
      end if;
    end if;
    new.antall := null; new.versjon := null;
  end if;
  new.epost := lower(btrim(new.epost));
  new.navn := btrim(new.navn);
  if new.levering = 'hent' then
    new.adresse := null; new.postnummer := null; new.poststed := null;
  else
    new.adresse := btrim(new.adresse); new.poststed := btrim(new.poststed);
  end if;
  if (select count(*) from public.forhandsbestillinger where opprettet > now() - interval '10 minutes') >= 60 then
    raise exception 'For mange påmeldinger akkurat nå. Prøv igjen litt senere.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists forhandsbestilling_inn on public.forhandsbestillinger;
create trigger forhandsbestilling_inn
  before insert on public.forhandsbestillinger
  for each row execute function public.forhandsbestilling_inn();

-- Telleren på nettsiden: bare tall per versjon, ingen personopplysninger
create or replace function public.forhandsbestilling_status()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'foto',            coalesce(sum(antall_foto), 0),
    'illustrasjoner',  coalesce(sum(antall_illustrasjoner), 0),
    'totalt',          coalesce(sum(antall_foto + antall_illustrasjoner), 0),
    'mal',             100
  )
  from public.forhandsbestillinger
  where status <> 'trukket';
$$;

revoke all on function public.forhandsbestilling_status() from public;
grant execute on function public.forhandsbestilling_status() to anon, authenticated;
revoke all on function public.forhandsbestilling_inn() from public, anon, authenticated;

-- Lista til Vipps-kravene. Blir begge versjonene trykket: belop_begge.
-- Blir bare én trykket: beløpet for den versjonen + frakt.
-- Åpne den i Table Editor → vipps_krav. Den kan ikke leses fra nettsiden.
drop view if exists public.vipps_krav;
create view public.vipps_krav
with (security_invoker = true)
as
select
  opprettet,
  navn,
  mobil,
  antall_foto,
  antall_illustrasjoner,
  case levering when 'post' then 'Post' else 'Hente selv' end as levering,
  (levering = 'post' and adresse is null) as mangler_adresse,   -- spør om adressen når det blir trykk
  antall_foto * 199 as belop_foto,
  antall_illustrasjoner * 199 as belop_illustrasjoner,
  case levering when 'post' then 69 else 0 end as frakt,
  (antall_foto + antall_illustrasjoner) * 199 + case levering when 'post' then 69 else 0 end as belop_begge,
  status,
  epost,
  adresse,
  postnummer,
  poststed,
  merknad,
  id
from public.forhandsbestillinger
where status <> 'trukket'
order by opprettet;

revoke all on public.vipps_krav from anon, authenticated;

-- Nyttig senere (kjør selv ved behov):
--   Sett status etter betaling:  update forhandsbestillinger set status = 'betalt' where mobil = '91234567';
--   Slett gamle påmeldinger:     delete from forhandsbestillinger where status = 'venter' and opprettet < now() - interval '12 months';
--   Slett alt hvis det ikke blir trykk:  delete from forhandsbestillinger where status = 'venter';
