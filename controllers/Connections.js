'use strict';
const { sanitizeEntity } = require("strapi-utils")

module.exports = {
  find: async (ctx) => {
    const rooms = await strapi.io.of('/').adapter.allRooms();
    strapi.log.info(`find rooms `,rooms.entries())
    console.log(`find rooms `,Array.from(rooms))
    const sockets = await strapi.io.of('/').adapter.sockets(new Set());
    strapi.log.info(`find sockets `,sockets.entries())
    console.log(`find sockets `,Array.from(sockets))

    // const connections = Object.values(strapi.io.sockets.connected).map(socket => socket.user_id)
    let data = await strapi.query('user', 'users-permissions').find({ socketId_in: Array.from(sockets) });
    //entities.map(entity => sanitizeEntity(entity, { model: strapi.models.restaurant }))
    data = data.map(entity => {
      return sanitizeEntity(entity,{ model:strapi.query('user', 'users-permissions').model})
    })
    ctx.send({
      connections: data
    });
  },
  delete: async (ctx) => {
    const { ssoId } = ctx.params
    let ret = await strapi.plugins.pusher.services.connection.disconnect(ssoId)
    // const connection = Object.values(strapi.io.sockets.connected).find(socket => socket.user_id == ctx.params.user_id)
    // if (connection) connection.disconnect()
    return {success: ret};
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
    strapi.log.warn('PID=',process.pid,' sendRoom ', {roomId, eventKey, msg})

    await strapi.plugins.pusher.services.notification.send(roomId, eventKey, msg)

    return { roomId }
  }
};