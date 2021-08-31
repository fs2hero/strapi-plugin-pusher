'use strict';
const { sanitizeEntity } = require("strapi-utils")

module.exports = {
  find: async (ctx) => {
    const sockets = await strapi.io.of('/').adapter.sockets(new Set());

    let data = await strapi.query('user', 'users-permissions').find({ socketId_in: Array.from(sockets) });
    data = data.map(entity => {
      return sanitizeEntity(entity,{ model:strapi.query('user', 'users-permissions').model})
    })
    
    return {
      connections: data
    }
  },
  findRoomUser: async (ctx) => {
    const { roomId } = ctx.params
    const sockets = await strapi.io.of('/').adapter.sockets(new Set([roomId]));

    let data = await strapi.query('user', 'users-permissions').find({ socketId_in: Array.from(sockets) });
    data = data.map(entity => {
      return sanitizeEntity(entity,{ model:strapi.query('user', 'users-permissions').model})
    })
    
    return {
      connections: data
    }
  },
  delete: async (ctx) => {
    const { ssoId } = ctx.params
    let ret = await strapi.plugins.pusher.services.connection.disconnect(ssoId)

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