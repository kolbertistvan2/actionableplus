import React from 'react';
import {
  Target,
  BarChart3,
  Megaphone,
  Search,
  Palette,
  Compass,
  TrendingUp,
  Rocket,
  Code,
  Truck,
} from 'lucide-react';
import { cn } from '~/utils';

// ActionablePlus E-commerce Consulting Category Icons
const categoryIconMap: Record<string, React.ElementType> = {
  cro: Target,
  analytics: BarChart3,
  marketing: Megaphone,
  seo: Search,
  ux: Palette,
  market_research: Compass,
  growth: TrendingUp,
  gtm: Rocket,
  technical: Code,
  operations: Truck,
};

// ActionablePlus E-commerce Consulting Category Colors
const categoryColorMap: Record<string, string> = {
  cro: 'text-red-500',
  analytics: 'text-blue-500',
  marketing: 'text-purple-500',
  seo: 'text-green-500',
  ux: 'text-pink-500',
  market_research: 'text-cyan-500',
  growth: 'text-emerald-500',
  gtm: 'text-orange-500',
  technical: 'text-slate-500',
  operations: 'text-amber-500',
};

export default function CategoryIcon({
  category,
  className = '',
}: {
  category: string;
  className?: string;
}) {
  const IconComponent = categoryIconMap[category];
  const colorClass = categoryColorMap[category] + ' ' + className;
  if (!IconComponent) {
    return null;
  }
  return <IconComponent className={cn(colorClass, className)} aria-hidden="true" />;
}
