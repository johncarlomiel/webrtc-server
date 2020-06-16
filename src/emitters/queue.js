const events = require('events');
const { v1: uuidv1, v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/index');

let rooms = [];
let onQueue = [];

const queueChecker = new events.EventEmitter();

queueChecker.on('new-client-queuing', (client, userId) => {
  onQueue.push({ userId, client });
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
          clientWs: client,
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
    rooms.push(newRoom);
  }
});


queueChecker.on('cancel-queue', (userId) => {
  onQueue = onQueue.filter(({ userId: clientUserId }) => userId !== clientUserId)
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
          sendMessage(initiator.clientWs, payload);
          sendMessage(receiver.clientWs, payload);
        }
      }

      return room;
    });
  }


  if (response === 'reject') {
    const test = rooms.find(({ roomId: storedRoomId }) => storedRoomId === roomId);
    const { initiator, receiver } = rooms.find(({ roomId: storedRoomId }) => storedRoomId === roomId);
    const clients = [initiator, receiver];

    clients.forEach(({ clientWs, userId:storedUserId }) => {
      if (storedUserId !== userId) {
        sendMessage(clientWs, { type: 'break-match' })
      }
    }); 
    rooms = rooms.filter(({ roomId: storedRoomId }) => storedRoomId !== roomId);
  }

});


module.exports = queueChecker;