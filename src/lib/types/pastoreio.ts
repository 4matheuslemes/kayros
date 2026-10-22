export interface ShepherdingVisit {
  id: string;
  user_id: string;
  family_or_person: string;
  visit_date: string;
  companion?: string | null;
  next_visit_date?: string | null;
  report?: string | null;
  companion_member_id?: string | null;
  other_people?: string[] | null;
  created_at: string;
  updated_at: string;
  member_ids?: string[];
}

export interface ShepherdingVisitFormData {
  family_or_person: string;
  visit_date: string;
  companion?: string;
  next_visit_date?: string;
  report?: string;
  companion_member_id?: string | null;
  other_people?: string[];
  member_ids?: string[];
}
