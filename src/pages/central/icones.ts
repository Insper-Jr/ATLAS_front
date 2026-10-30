import {
  BarChart3,
  BookOpen,
  Calculator,
  Compass,
  Database,
  FileCheck,
  FlaskConical,
  Globe,
  Layers,
  Lightbulb,
  PenTool,
  Presentation,
  Puzzle,
  Scale,
  Search,
  Sparkles,
  Table,
  Target,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ICONES_CATEGORIA } from "@/lib/central";

/** O componente de cada nome de ícone que uma categoria pode usar. */
export const ICONES: Record<(typeof ICONES_CATEGORIA)[number], LucideIcon> = {
  compass: Compass,
  wrench: Wrench,
  "book-open": BookOpen,
  sparkles: Sparkles,
  "file-check": FileCheck,
  "bar-chart-3": BarChart3,
  lightbulb: Lightbulb,
  target: Target,
  layers: Layers,
  database: Database,
  "pen-tool": PenTool,
  calculator: Calculator,
  scale: Scale,
  users: Users,
  globe: Globe,
  puzzle: Puzzle,
  search: Search,
  presentation: Presentation,
  table: Table,
  "flask-conical": FlaskConical,
};

export function iconeDaCategoria(nome: string | null | undefined): LucideIcon {
  return (nome && ICONES[nome as keyof typeof ICONES]) || Compass;
}
