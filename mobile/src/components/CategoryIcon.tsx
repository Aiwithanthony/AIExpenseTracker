import React from 'react';
import {
  ForkKnife,
  ShoppingCart,
  Car,
  ShoppingBag,
  Lightbulb,
  FilmSlate,
  Stethoscope,
  BookOpen,
  AirplaneTilt,
  TShirt,
  Coffee,
  CurrencyDollar,
  IconWeight,
} from 'phosphor-react-native';

/**
 * Maps an expense category name to a Phosphor icon. Replaces the old emoji
 * badges (categoryEmoji.ts). Keep the keys lowercase — lookups lowercase the
 * name. Unknown categories fall back to CurrencyDollar.
 */
const MAP: Record<string, React.ComponentType<any>> = {
  'food & beverages': ForkKnife,
  food: ForkKnife,
  groceries: ShoppingCart,
  transportation: Car,
  shopping: ShoppingBag,
  'bills & utilities': Lightbulb,
  entertainment: FilmSlate,
  healthcare: Stethoscope,
  education: BookOpen,
  travel: AirplaneTilt,
  clothing: TShirt,
  coffee: Coffee,
  uncategorized: CurrencyDollar,
};

export function iconComponentForCategory(name?: string): React.ComponentType<any> {
  if (!name) return CurrencyDollar;
  return MAP[name.toLowerCase()] || CurrencyDollar;
}

export default function CategoryIcon({
  name,
  size = 24,
  color,
  weight = 'duotone',
}: {
  name?: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
}) {
  const Icon = iconComponentForCategory(name);
  return <Icon size={size} color={color} weight={weight} />;
}
