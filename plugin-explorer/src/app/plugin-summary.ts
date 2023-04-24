export interface PluginSummary {
  plugins: Plugin[];
}

export interface Plugin {
  name: string;
  version: string;
  success: string[];
  repo?: string;
  keywords?: string[];
  fails: string[];
  description?: string;
  quality?: number;
  versions: string[];
  platforms: string[];
  author: any;
  bugs?: string;
  published: string;
  downloads?: number;
  stars?: number;
  image?: string;
  updated?: string;
  license: string;
  title: string; // Calculated
  tags: string[]; // Calculated
  rating: number; // Calculated
  ratingInfo: string; // Calculated
  tagInfo: string; // Calcuilated
  dailyDownloads: string; // Calculated
  changed: string; // Calculated
  installed: boolean; // Calculated: whether the plugin is installed in the current project
}

export interface PluginInfo {
  name: string;
  version: string;
}
