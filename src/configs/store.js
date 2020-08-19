const NodeCache = require("node-cache");
const myCache = new NodeCache();

// Initialize all variables
myCache.set('rooms', []);
myCache.set('onQueue', []);

module.exports = {
  // Rooms
  get rooms() {
    console.log('getting rooms')
    return myCache.get('rooms');
  },
  set rooms(data) { 
    console.log('setting rooms');
    myCache.set('rooms', data); 
  },

  // onQueue
  get onQueue() {
    return myCache.get('onQueue');
  },
  set onQueue(data) { 
    console.log('onQueue', data)
    myCache.set('onQueue', data) 
  },

  addClient(client) {
    this.clients.push(client);
  },

  findClient(userId) {
    return this.clients.find(({ userId: storedUserId}) => storedUserId === userId);
  },

  clients: []
};