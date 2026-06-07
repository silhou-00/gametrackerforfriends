import React from 'react';
import { Ionicons } from '@expo/vector-icons';

const ICON_MAP: Record<string, string> = {
  library:  'library-outline',
  play:     'play',
  history:  'time-outline',
  settings: 'options-outline',
  plus:     'add',
  minus:    'remove',
  back:     'chevron-back',
  chevR:    'chevron-forward',
  mic:      'mic-outline',
  wifi:     'wifi-outline',
  check:    'checkmark',
  close:    'close',
  trophy:   'trophy-outline',
  trash:    'trash-outline',
  download: 'download-outline',
  shield:   'shield-checkmark-outline',
  dots:     'ellipsis-vertical',
  edit:     'pencil-outline',
  lan:      'globe-outline',
  reset:    'refresh-outline',
  grid:     'grid-outline',
  pdf:      'document-text-outline',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color = 'currentColor' }: IconProps) {
  const ionName = ICON_MAP[name] || 'help-circle-outline';
  return <Ionicons name={ionName as any} size={size} color={color} />;
}
