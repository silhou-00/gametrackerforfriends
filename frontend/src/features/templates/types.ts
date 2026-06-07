export type RuleBlockType =
  | 'score_direction'
  | 'score_starting_value'
  | 'score_increment'
  | 'win_condition'
  | 'score_target'
  | 'rounds_enabled'
  | 'max_rounds'
  | 'auto_advance_round'
  | 'turn_order'
  | 'custom_note';

export interface RuleBlock {
  id: string;
  type: RuleBlockType;
  value: string | number | boolean | null;
}

export interface RulesConfig {
  blocks: RuleBlock[];
}

export interface GameTemplate {
  id: string;
  name: string;
  description: string | null;
  rulesConfig: RulesConfig;
  createdAt: number;
}
