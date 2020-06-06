const events = require('events');
const { v1: uuidv1, v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/index');

let rooms = [];
let onQueue = [];

const queueChecker = new events.EventEmitter();

queueChecker.on('new-client-queuing', (client, userId) => {
  onQueue.push({ userId, client });
  console.log('store.onQueue >> ', onQueue.length);
  if (onQueue.length >= 2) {
    const roomId = uuidv4();
    let newRoom = {
      roomId
    };

    let payload = {
      type: 'received-queue-info'
    }

    const roles = ['initiator', 'receiver'];

    onQueue = onQueue.filter(({ client, userId }, clientIndex) => {
      if (clientIndex !== 2) {
        const role = roles[clientIndex];
        newRoom[role] = {
          client,
          userId,
          status: 'pending'
        }
        return sendMessage(
          client,
          Object.assign(payload, {
            data: {
              role, roomId
            }
          })
        )
      }

      return false;
    });
    console.log(onQueue);
    rooms.push(newRoom);
  }
});


queueChecker.on('cancel-queue', (userId) => {
  onQueue = onQueue.filter(({ userId: clientUserId }) => userId !== clientUserId)
  console.log(onQueue);
});

queueChecker.on('respond-to-invitation', ({ roomId, response }, userId) => {
  if (response === 'accept') {
    rooms = rooms.map((room) => {
      const { initiator, receiver, roomId: storedRoomId } = room;
      const clients = [initiator, receiver];
      if (storedRoomId === roomId) {
        if (initiator.userId === userId) {
          initiator.status = 'accepted';
        }

        if (receiver.userId === userId) {
          receiver.status = 'accepted';
        }

        matchReady = clients.every(({ status }) => status === 'accepted');

        if (matchReady) {
          const payload = {
            data: { roomId },
            type: 'match-ready'
          };
          sendMessage(initiator.client, payload);
          sendMessage(receiver.client, payload);
        }
      }

      return room;
    });
    console.log(rooms);
  }


  if (response === 'reject') {
    const { initiator, receiver } = rooms.find(({ roomId: storedRoomId }) => storedRoomId === roomId);
    const clients = [initiator, receiver];
    clients.forEach(client => {
      if (client.userId !== userId) {
        sendMessage(client, { type: 'break-match' })
      }
    });
    rooms = rooms.filter(({ roomId: storedRoomId }) => storedRoomId !== roomId);
  }

});


module.exports = queueChecker;