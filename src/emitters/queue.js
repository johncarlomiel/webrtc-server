const events = require('events');
const { v1: uuidv1, v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/index');
const store = require('../configs/store');
const { onQueue } = require('../configs/store');

const queueChecker = new events.EventEmitter();

queueChecker.on('ready-handshake', ({ roomId }, userId) => {
  store.rooms = store.rooms.map(room => {
    const { participants, roomId: storedRoomId } = room;
    if (storedRoomId === roomId) {
      room.participants = room.participants.map((participant) => {
        if (participant.userId === userId) {
          participant.readyToHandshake = true;
        }

        return participant
      });

      handshakeReady = participants.every(({ readyToHandshake }) => readyToHandshake);

      if (handshakeReady) {
        const createHandshakePayload = (role, userId) => {
          return {
            data: { roomId, role, username: userId },
            type: 'handshake-ready'
          };
        };

        const { userId: initiatorUserId } = participants.find(({ role }) => role === 'initiator');
        const { ws: initiatorWs } = store.findClient(initiatorUserId);

        const { userId: receiverUserId } = participants.find(({ role }) => role === 'receiver');
        const { ws: receiverWs } = store.findClient(receiverUserId);

        sendMessage(initiatorWs, createHandshakePayload('initiator', initiatorUserId));
        sendMessage(receiverWs, createHandshakePayload('receiver', receiverUserId));
      }
    }
    return room;
  });
});

queueChecker.on('new-client-queuing', (client, userId) => {
  store.onQueue = store.onQueue.concat(userId);
  if (store.onQueue.length >= 2) {
    const roomId = uuidv4();
    let newRoom = {
      roomId,
      participants: []
    };

    let payload = {
      type: 'received-queue-info'
    }

    const roles = ['initiator', 'receiver'];

    store.onQueue = store.onQueue.filter((userId, clientIndex) => {
      if (clientIndex !== 2) {
        const role = roles[clientIndex];
        const { ws } = store.findClient(userId);

        newRoom.participants.push({
          userId,
          role,
          status: 'pending',
          readyToHandshake: false
        });

        return sendMessage(
          ws,
          Object.assign(payload, {
            data: {
              role, roomId
            }
          })
        )
      }

      return false;
    });
    store.rooms = store.rooms.concat(newRoom);
  }
});

queueChecker.on('cancel-queue', (clientUserId) => {
  store.onQueue = store.onQueue.filter((userId) => userId !== clientUserId)
});

queueChecker.on('respond-to-invitation', ({ roomId, response }, userId) => {
  if (response === 'accept') {
    store.rooms = store.rooms.map((room) => {
      const { participants, roomId: storedRoomId } = room;
      if (storedRoomId === roomId) {
        room.participants = room.participants.map((participant) => {
          if (participant.userId === userId) {
            participant.status = 'accepted';
          }

          return participant;
        });

        matchReady = participants.every(({ status }) => status === 'accepted');

        if (matchReady) {
          const payload = {
            data: { roomId },
            type: 'match-ready'
          };

          const { userId: initiatorUserId } = participants.find(({ role }) => role === 'initiator');
          const { ws: initiatorWs } = store.findClient(initiatorUserId);

          const { userId: receiverUserId } = participants.find(({ role }) => role === 'receiver');
          const { ws: receiverWs } = store.findClient(receiverUserId);

          sendMessage(initiatorWs, payload);
          sendMessage(receiverWs, payload);
        }
      }
      return room;
    });
  }

  if (response === 'reject') {
    const { participants } = store.rooms.find(({ roomId: storedRoomId }) => storedRoomId === roomId);

    participants.forEach(({ userId: storedUserId }) => {
      if (storedUserId !== userId) {
        const { ws } = store.findClient(storedUserId);
        sendMessage(ws, { type: 'break-match' })
      }
    });

    store.rooms = store.rooms.filter(({ roomId: storedRoomId }) => storedRoomId !== roomId);
  }

});

queueChecker.on('add-candidate', ({ roomId, role, candidate }) => {
  const oppositeRole = getOppositeRole(role);
  const room = store.rooms.find(room => room.roomId === roomId);
  const { userId } = room.participants.find((participant) => participant.role === oppositeRole);
  const { ws } = store.findClient(userId);

  sendMessage(ws, {
    type: 'add-candidate',
    data: {
      candidate
    }
  });

});

queueChecker.on('receive-offer', ({ roomId, offer }) => {
  // When the initiator send the offer to the server
  // the server will send it to the receiver
  const room = store.rooms.find(room => room.roomId === roomId);
  const { userId } = room.participants.find((participant) => participant.role === 'receiver');
  const { ws } = store.findClient(userId);

  sendMessage(ws, {
    type: 'offer',
    data: {
      offer
    }
  });
});

queueChecker.on('receive-answer', ({ roomId, answer }) => {
  // When the receiver send the answer to the offer
  // send to initiator the offer
  const room = store.rooms.find(room => room.roomId === roomId);
  const { userId } = room.participants.find((participant) => participant.role === 'initiator');
  const { ws } = store.findClient(userId);

  sendMessage(ws, {
    type: 'answer',
    data: {
      answer
    }
  });
});

queueChecker.on('disconnect', (userId) => {
  // Clean the queue 
  store.onQueue = store.onQueue.filter((storedUserId) => storedUserId !== userId);
  store.rooms = store.rooms.filter((room) => {
    // Find all store.rooms that the 
    // participant in and remove it

    const { participants } = room;
    const isParticipant = participants.find((participant) => participant.userId === userId);
    // if user is participant of the room
    // notify all participant of the disconnection
    if (isParticipant) {
      participants.forEach(({ userId }) => {
        const { ws } = store.findClient(userId);
        sendMessage(ws, {
          type: 'disconnect'
        });
      });
    }

    // Return all rooms that the disconnected 
    // user is not a participant
    return !isParticipant;
  });
});


function getOppositeRole(role) {
  return role === 'initiator' ? 'receiver' : 'initiator';
}

module.exports = queueChecker;