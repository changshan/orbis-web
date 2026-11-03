// The official package exports { default: Client } in CommonJS. Keep this boundary
// explicit so Node test runners and the Workers bundler use the same SDK method.
exports.getAuthorization = require("@alicloud/openapi-util").default.getAuthorization;
