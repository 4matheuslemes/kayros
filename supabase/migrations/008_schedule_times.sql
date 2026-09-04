-- Horário do agendamento pontual (revisita), separado da data
alter table public.visit_history
  add column next_visit_time time;

-- Horário fixo do estudo recorrente, aplicado a todos os study_days
alter table public.contacts
  add column study_time time;
