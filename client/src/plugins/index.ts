/**
 * Plugin System for Fushuma Governance Hub
 * 
 * Modular plugin architecture inspired by Aragon's gov-app-template
 * Allows easy addition of new governance mechanisms
 */

import { type ComponentType } from 'react';

export interface PluginRoute {
  path: string;
  component: ComponentType;
  title: string;
}

export interface GovernancePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  icon?: ComponentType;
  routes: PluginRoute[];
  contractAddress?: string;
  abi?: any[];
  enabled: boolean;
}

// Plugin registry
const plugins: Map<string, GovernancePlugin> = new Map();

/**
 * Register a governance plugin
 */
export function registerPlugin(plugin: GovernancePlugin) {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin ${plugin.id} is already registered`);
    return;
  }
  
  plugins.set(plugin.id, plugin);
  console.log(`Registered plugin: ${plugin.name} (${plugin.id})`);
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): GovernancePlugin[] {
  return Array.from(plugins.values());
}

/**
 * Get enabled plugins only
 */
export function getEnabledPlugins(): GovernancePlugin[] {
  return Array.from(plugins.values()).filter(p => p.enabled);
}

/**
 * Get plugin by ID
 */
export function getPlugin(id: string): GovernancePlugin | undefined {
  return plugins.get(id);
}

/**
 * Enable/disable a plugin
 */
export function setPluginEnabled(id: string, enabled: boolean) {
  const plugin = plugins.get(id);
  if (plugin) {
    plugin.enabled = enabled;
  }
}

/**
 * Get all routes from enabled plugins
 */
export function getPluginRoutes(): PluginRoute[] {
  const routes: PluginRoute[] = [];
  
  for (const plugin of getEnabledPlugins()) {
    routes.push(...plugin.routes);
  }
  
  return routes;
}

// Export plugin types
export type { PluginRoute, GovernancePlugin };

