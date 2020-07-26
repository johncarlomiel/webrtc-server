const events = require('events');
const { v1: uuidv1, v4: uuidv4 } = require('uuid');
const { sendMessage } = require('../utils/index');

let rooms = [];
let onQueue = [];

const queueChecker = new events.EventEmitter();

queueChecker.on('ready-handshake', ({ roomId }, userId) => {
  console.log('ready-handshake', userId);
  console.log(rooms);
  rooms = rooms.map(room => {
    const { initiator, receiver, roomId: storedRoomId } = room;
    const clients = [initiator, receiver];
    if (storedRoomId === roomId) {
      if (initiator.userId === userId) {
        initiator.readyToHandshake = true;
      }

      if (receiver.userId === userId) {
        receiver.readyToHandshake = true;
      }

      handshakeReady = clients.every(({ readyToHandshake }) => readyToHandshake);

      if (handshakeReady) {
        const createHandshakePayload = (role, userId) => {
          return {
            data: { roomId, role, username: userId },
            type: 'handshake-ready'
          };
        };
        sendMessage(initiator.clientWs, createHandshakePayload('initiator', initiator.userId));
        sendMessage(receiver.clientWs, createHandshakePayload('receiver', receiver.userId));
      }

      console.log('Handshake Ready', handshakeReady);
    }
    return room;
  });
});

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
          status: 'pending',
          readyToHandshake: false
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
    const { initiator, receiver } = rooms.find(({ roomId: storedRoomId }) => storedRoomId === roomId);
    const clients = [initiator, receiver];

    clients.forEach(({ clientWs, userId: storedUserId }) => {
      if (storedUserId !== userId) {
        sendMessage(clientWs, { type: 'break-match' })
      }
    });
    rooms = rooms.filter(({ roomId: storedRoomId }) => storedRoomId !== roomId);
  }

});

queueChecker.on('add-candidate', ({ roomId, role, candidate }, userId) => {
  console.log('Add Candidate event: ');
  console.log({ roomId, role, candidate });
  const oppositeRole = getOppositeRole(role);
  const room = rooms.find(room => room.roomId === roomId);
  const { clientWs } = room[oppositeRole];

  sendMessage(clientWs, {
    type: 'add-candidate',
    data: {
      candidate
    }
  });

});

queueChecker.on('receive-offer', ({ roomId, offer }) => {
  console.log('Receive offer event: ');
  console.log({ roomId, offer });
  // When the initiator send the offer to the server
  // the server will send it to the receiver
  const room = rooms.find(room => room.roomId === roomId);
  const { clientWs } = room['receiver'];

  sendMessage(clientWs, {
    type: 'offer',
    data: {
      offer
    }
  });
});

queueChecker.on('receive-answer', ({ roomId, answer }) => {

  console.log('Receive answer event: ');
  console.log({ roomId, answer });
  // When the receiver send the answer to the offer
  // send to initiator the offer
  const room = rooms.find(room => room.roomId === roomId);
  console.log('Error', room);
  const { clientWs } = room['initiator'];

  sendMessage(clientWs, {
    type: 'answer',
    data: {
      answer
    }
  });
});


function getOppositeRole(role) {
  return role === 'initiator' ? 'receiver' : 'initiator';
}

module.exports = queueChecker;