module.exports = {
  join : async (ssoId, roomId) => {
    // const connection = Object.values(strapi.io.sockets.connected).find(socket => socket.user_id = String(userId))
    // if(connection) await strapi.io.sockets.connected[connection.id].join(String(roomId))
    
    try {
      let data = await strapi.query('user', 'users-permissions').findOne({ ssoId });
      await strapi.io.of('/').adapter.remoteJoin(data.socketId,roomId);
      return true
    }
    catch(err) {
      return false
    }
  },
  leave : async (ssoId, roomId) => {
    try {
      let data = await strapi.query('user', 'users-permissions').findOne({ ssoId });
      await strapi.io.of('/').adapter.remoteLeave(data.socketId,roomId);
      return true
    }
    catch(err) {
      return false
    }
  },
  send : async (roomId, eventKey, data) => {
    strapi.log.debug('send ',{roomId, eventKey, data})
    strapi.io.to(String(roomId)).emit(String(eventKey), data)    
  }  
}