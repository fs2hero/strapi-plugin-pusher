'use strict'

module.exports = () => {
  // ********************************************* //
  // This script handle new connections and attach //
  // socket.io to the server, to be used anywhere  //
  // ********************************************* //
  const io = require('socket.io')(strapi.server);
  const redisAdapter = require('socket.io-redis');
  io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
  io.on('connect', async function (socket) {
    try {
      const { jwt } = socket.handshake.query
      const payload = await strapi.plugins['users-permissions'].services.jwt.verify(jwt);
      // 1 - kill old connections for this user
      await strapi.plugins.pusher.services.connection.disconnect(payload.id)
      // 2 - load authenticated user data
      const data = await strapi.query('user', 'users-permissions').findOne({ id: payload.id });
      // 3 - check if user exists
      if (!data) throw Error("User not found")
      // 4 - register user id on connected socket
      socket.user_id = payload.id
      // 5 - join user to a room called user_${id} for future use
      await socket.join(`user::${payload.id}`)
      // 6 - hook socket connection for extensions implementation
      await strapi.plugins.pusher.config.functions.connection(socket, data)
    } catch (error) {
      socket.disconnect()
    }
  });
  // 7 - register socket io inside strapi core to use it globally
  strapi.io = io;
  strapi.io.send = strapi.plugins.pusher.services.notification.send
  strapi.io.join = strapi.plugins.pusher.services.notification.join
};