-- ═══════════════════════════════════════════════════════════
-- Kairós — Backfill de weekly_schedule para perfis existentes
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════

-- Preenche weekly_schedule para usuários que configuraram dias, mas não as horas
update public.profiles
set weekly_schedule = (
  select jsonb_object_agg(
    case 
      when d = 1 then 'monday'
      when d = 2 then 'tuesday'
      when d = 3 then 'wednesday'
      when d = 4 then 'thursday'
      when d = 5 then 'friday'
      when d = 6 then 'saturday'
      when d = 7 then 'sunday'
    end,
    -- Calcula os minutos diários ideais (arredondado para inteiro)
    -- Meta em minutos: (monthly_goal_hours * 60)
    -- Média de semanas no mês: 4.33
    -- Dividido pela quantidade de dias escolhidos: array_length(working_days, 1)
    round((monthly_goal_hours * 60) / (4.33 * array_length(working_days, 1)))
  )
  from unnest(working_days) as d
)
where 
  -- Apenas onde a programação está nula ou vazia
  (weekly_schedule is null or weekly_schedule = '{}'::jsonb)
  -- E onde o usuário já tem dias da semana configurados
  and array_length(working_days, 1) > 0;
