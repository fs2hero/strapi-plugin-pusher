const pluginPkg = require('../../package.json');
const pluginId = pluginPkg.name.replace(
  /^strapi-plugin-/i,
  ''
);

console.log(pluginId)

module.exports = pluginId;
