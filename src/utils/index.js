const sendMessage = (client, payload) => {
    client.send(JSON.stringify(payload));
};


module.exports = {
    sendMessage
}