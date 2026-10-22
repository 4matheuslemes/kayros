export type CongregationAppointment = "anciao" | "servo_ministerial";

export type CongregationServiceStatus =
  | "publicador_batizado"
  | "publicador_nao_batizado"
  | "pioneiro_regular"
  | "pioneiro_auxiliar_continuo";

export interface CongregationMember {
  id: string;
  user_id: string;
  full_name: string;
  appointment: CongregationAppointment | null;
  service_status: CongregationServiceStatus;
  is_self: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CongregationMemberFormData {
  full_name: string;
  appointment?: CongregationAppointment | null;
  service_status: CongregationServiceStatus;
  active: boolean;
}

export interface MemberWithLastVisit extends CongregationMember {
  last_visit_date: string | null;
  last_visit_companion: string | null;
  next_visit_date: string | null;
}
