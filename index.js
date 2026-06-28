/**
 * next-lxd-sftp — LXD instance SFTP operations via a Node.js native addon.
 *
 * @module next-lxd-sftp
 */
const path = require('path');
const binaryPath = require('@mapbox/node-pre-gyp').find(
	path.resolve(path.join(__dirname, './package.json'))
);
module.exports = require(binaryPath);
