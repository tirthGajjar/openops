const { composePlugins, withNx } = require('@nx/webpack');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const path = require('path');
const fs = require('fs');

// Helper to get all block directories
function getBlockDirectories() {
  const blocksPath = path.resolve(__dirname, '../../blocks');
  const blockDirs = [];

  function findBlockDirs(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !['node_modules', 'dist', 'framework', 'common'].includes(entry.name)
        ) {
          const fullPath = path.join(dir, entry.name);
          const packageJsonPath = path.join(fullPath, 'package.json');

          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf-8'),
            );
            if (packageJson.name?.startsWith('@openops/block-')) {
              blockDirs.push(fullPath);
            } else {
              findBlockDirs(fullPath);
            }
          } catch {
            findBlockDirs(fullPath);
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  findBlockDirs(blocksPath);
  return blockDirs;
}

module.exports = composePlugins(withNx(), (config) => {
  config.plugins.push(new IgnoreDynamicRequire());

  // For production builds, configure externals to exclude @openops/server-shared
  if (process.env.NODE_ENV === 'production') {
    // Override externals to not externalize @openops/server-shared and @openops/shared
    config.externals = function (context, request, callback) {
      // Don't externalize these OpenOps workspace packages - bundle them instead
      if (
        request === '@openops/server-shared' ||
        request === '@openops/shared'
      ) {
        return callback();
      }

      // Externalize all other node_modules
      if (/^[a-z@][a-z.\-0-9]*/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }

      return callback();
    };
  }

  // Only add smart block watching in development
  if (process.env.NODE_ENV !== 'production') {
    // Enhanced webpack plugin for smarter block watching
    config.plugins.push({
      apply: (compiler) => {
        let isInitialBuild = true;
        const changedBlocks = new Set();

        // Watch individual block directories instead of the entire blocks folder
        compiler.hooks.afterCompile.tap('SmartBlockWatcher', (compilation) => {
          const blockDirs = getBlockDirectories();
          blockDirs.forEach((dir) => {
            compilation.contextDependencies.add(dir);
          });
        });

        // Handle file changes more intelligently
        compiler.hooks.invalid.tap(
          'SmartBlockWatcher',
          (filename, changeTime) => {
            if (filename && filename.includes('/packages/blocks/')) {
              const relativePath = path.relative(
                path.resolve(__dirname, '../..'),
                filename,
              );
              const pathParts = relativePath.split('/');

              if (
                pathParts[0] === 'packages' &&
                pathParts[1] === 'blocks' &&
                pathParts[2]
              ) {
                changedBlocks.add(pathParts[2]);
              }
            }
          },
        );

        // Coordinate builds between API and Engine servers
        compiler.hooks.beforeCompile.tapAsync(
          'SmartBlockWatcher',
          (params, callback) => {
            if (isInitialBuild) {
              isInitialBuild = false;
              callback();
              return;
            }

            if (changedBlocks.size > 0) {
              console.log(
                `[API Server] Detected changes in blocks: ${Array.from(
                  changedBlocks,
                ).join(', ')}`,
              );

              // Import and call the incremental build function
              const { buildSpecificBlocks } = require('@openops/server-shared');
              const blockPaths = Array.from(changedBlocks).map((block) =>
                path.join(__dirname, '../../blocks', block),
              );

              buildSpecificBlocks(blockPaths)
                .then(() => {
                  changedBlocks.clear();
                  callback();
                })
                .catch((error) => {
                  console.error(
                    '[API Server] Failed to build changed blocks:',
                    error,
                  );
                  callback();
                });
            } else {
              callback();
            }
          },
        );
      },
    });
  }

  return config;
});
