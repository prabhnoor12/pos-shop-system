// plugins/pluginManager.js
// Powerful plugin manager for POS Shop System

import fs from 'fs';
import path from 'path';

class PluginManager {

  // Register a plugin with optional config
  registerPlugin(plugin, config = {}) {
    if (plugin.init) plugin.init(this.app, config, this);
    if (plugin.start) plugin.start(this.app, config, this);
    this.plugins.push({ plugin, config });
    if (plugin.name) {
      if (this.app?.locals?.logger) {
        this.app.locals.logger.info(`Plugin registered: ${plugin.name}`);
      }
    }
  }
  constructor(app, options = {}) {
    this.app = app;
    this.options = options;
    this.plugins = [];
    this.events = {};
  }

  // Load all plugins from the plugins directory
  loadPlugins(pluginDir = path.resolve('backend/plugins')) {
    const files = fs.readdirSync(pluginDir);
    const self = this;
    for (const file of files) {
      if (file.endsWith('.js') && file !== 'pluginManager.js') {
        const pluginPath = path.join(pluginDir, file);
        import(pathToFileUrl(pluginPath).href).then(module => {
          const plugin = module.default || module;
          self.registerPlugin(plugin, {});
        }).catch(err => {
          if (self.app?.locals?.logger) {
            self.app.locals.logger.error(`Failed to load plugin ${file}: ${err.message}`);
          }
        });
      }
    }
  }

}

// Helper to convert Windows paths to file URLs for dynamic import
function pathToFileUrl(filePath) {
  let resolved = path.resolve(filePath);
  if (process.platform === 'win32') {
    resolved = '/' + resolved.replace(/\\/g, '/');
  }
  return new URL('file://' + resolved);
}


export default PluginManager;
