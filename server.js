const https = require('https');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const allUsers = {};

// Load SSL/TLS Certificates
const options = {
    key: fs.readFileSync('./certificates/server.key'),
    cert: fs.readFileSync('./certificates/server.crt'),
};

// Serve Static Files (e.g., frontend code in the 'public' folder)
app.use(express.static('public'));

// Create HTTPS Server
const httpsServer = https.createServer(options, app);

// Initialize Socket.IO on the HTTPS server
const io = new Server(httpsServer);


// Handle socket connections
io.on("connection", (socket) => {
    console.log("User connected, with socket id: ", socket.id);
  
    socket.on("user:joined", (data) => {
      const { userName } = data;
      console.log(`User ${userName} joined, it's socket id is: ${socket.id}`);
      allUsers[userName] = { name: userName, id: socket.id };
      //broadcast to EVERYONE including self, and send allUsers to display
      console.log(allUsers);
      io.emit("user:joined", allUsers);
    });
  
    socket.on("offer", (data) => {
      // console.log("Offer received at backend", data);
      const { fromId, toId, offer } = data;
      io.to(toId).emit("offer", { fromId: fromId, offer: offer });
    });
  
    socket.on("answer", (data) => {
      // console.log("got answer at backend", data);
      const { fromId, toId, answer } = data;
      io.to(toId).emit("answer", { fromId: fromId, answer: answer });
    });
  
    socket.on("showEndCallBtn", (data) => {
      const { fromId, toId } = data;
      io.to(toId).emit("showEndCallBtn", { fromId: fromId });
    });
  
    socket.on("call-ended", (data) => {
      const { fromId, toId } = data;
      io.to(toId).emit("call-ended", { fromId: socket.id, toId: toId });
    });
  
    socket.on("disconnect", () => {
      console.log("User Disconnected, with socket id: ", socket.id);
    });
  
    socket.on("icecandidate", (candidate) => {
      // broadcast to everyone except self
      socket.broadcast.emit("icecandidate", { candidate, from: socket.id });
    });
  
    socket.on("getClientLocation", (data) => {
      const { fromId, toId } = data;
      console.log("received getClientLocation on backend ");
      
      io.to(toId).emit("getClientLocation", { fromId: fromId, to: toId });
    });
  
    socket.on("locationData", (data) => {
      const { locationData, fromId, toId } = data;
      console.log("received locationData on backend ");
      io.to(toId).emit("locationData", {
        locationData: locationData,
        fromId: socket.id,
        toId: toId,
      });
    });
  });
  

// Start HTTPS Server
const PORT = 9000;
httpsServer.listen(PORT, "0.0.0.0",() => {
    console.log(`HTTPS Socket.IO server running at https://localhost:${PORT}`);
});
