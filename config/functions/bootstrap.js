'use strict'

module.exports = () => {
  // ********************************************* //
  // This script handle new connections and attach //
  // socket.io to the server, to be used anywhere  //
  // ********************************************* //
  const io = require('socket.io')(strapi.server);
  const { createClient } = require('redis');
  const redisAdapter = require('@socket.io/redis-adapter');
  const pubClient = createClient({ host: 'localhost', port: 6379 });
  const subClient = pubClient.duplicate();
  io.adapter(redisAdapter(pubClient, subClient));

  io.on('connect', async function (socket) {
    try {
      const { token:jwt } = socket.handshake.query
      strapi.log.warn('PID=',process.pid,' connect ', socket.id,' jwt ',jwt)
      const payload = await strapi.plugins['users-permissions'].services.jwt.verify(jwt);
      // 1 - kill old connections for this user
      await strapi.plugins.pusher.services.connection.disconnect(payload.id)
      // 2 - load authenticated user data
      let data = await strapi.query('user', 'users-permissions').findOne({ ssoId: payload.id.toString() });
      // 3 - check if user exists
      if (!data) {
        data = await strapi.plugins.pusher.services.connection.createUser(payload.id);
        if(data.error) {
          strapi.log.error('socket connect create user fail ',JSON.stringify(data))
          socket.disconnect()
          return;
        }
        data = data.data
      }
      // 4 - register user id on connected socket
      // socket.user_id = data.id
      // socket.sso_id = data.ssoId
      await strapi.query('user', 'users-permissions').update({id: data.id}, { socketId: socket.id });
      // 5 - join user to a room called user_${id} for future use
      await strapi.io.of('/').adapter.remoteJoin(socket.id,`user::${data.id}`)
      // 6 - hook socket connection for extensions implementation
      await strapi.plugins.pusher.config.functions.connection(socket, data)
    } catch (error) {
      strapi.log.error(process.pid,' connect error ',error)
      socket.disconnect()
    }
  });

  // 7 - register socket io inside strapi core to use it globally
  strapi.io = io;
  strapi.io.send = strapi.plugins.pusher.services.notification.send
  strapi.io.join = strapi.plugins.pusher.services.notification.join

  strapi.log.info('processId ',process.pid)
};