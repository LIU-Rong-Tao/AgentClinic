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
