export interface ShepherdingVisit {
  id: string;
  user_id: string;
  family_or_person: string;
  visit_date: string;
  companion?: string | null;
  next_visit_date?: string | null;
  report?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShepherdingVisitFormData {
  family_or_person: string;
  visit_date: string;
  companion?: string;
  next_visit_date?: string;
  report?: string;
}
