'use strict';

module.exports = {
  find: async (ctx) => {
    const sockets = await strapi.io.of('/').adapter.sockets(new Set());
    strapi.log.info(`find sockets `,sockets)
    // const connections = Object.values(strapi.io.sockets.connected).map(socket => socket.user_id)
    const data = await strapi.query('user', 'users-permissions').find({ socketId_in: connections });
    ctx.send({
      connections: data.map((item) => {
        item.socket_id = item.socketId
        return item
      })
    });
  },
  delete: async (ctx) => {
    const { ssoId } = ctx.params
    let ret = await strapi.plugins.pusher.services.connection.disconnect(ssoId)
    // const connection = Object.values(strapi.io.sockets.connected).find(socket => socket.user_id == ctx.params.user_id)
    // if (connection) connection.disconnect()
    return ctx.send();
  },
  joinRoom: async (ctx) => {
    const { ssoId, roomId } = ctx.request.body
    const ret = await strapi.plugins.pusher.services.notification.join(ssoId, roomId)

    if(!ret) {
      return ctx.badRequest('joinRoom fail')
    }
    else {
      return { roomId }
    }
  },
  leaveRoom: async (ctx) => {
    const { ssoId, roomId } = ctx.request.body
    const ret = await strapi.plugins.pusher.services.notification.leave(ssoId, roomId)

    if(!ret) {
      return ctx.badRequest('leaveRoom fail')
    }
    else {
      return { roomId }
    }
  },
  sendRoom: async (ctx) => {
    const { roomId, eventKey, msg } = ctx.request.body
    await strapi.plugins.pusher.services.notification.send(roomId, eventKey, msg)

    return { roomId }
  }
};