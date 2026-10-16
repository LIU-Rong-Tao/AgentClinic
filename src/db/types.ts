export type AgentListItem = {
  id: number;
  name: string;
  model_type: string;
  status: 'active' | 'on_leave' | 'discharged';
};

export type Ailment = {
  id: number;
  name: string;
  description: string;
};

export type Therapy = {
  id: number;
  name: string;
  description: string;
};

export type RecommendedTherapy = Therapy & {
  matchedAilments: { id: number; name: string }[];
};
