const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const path = require("path");

const PORT = process.env.PORT || 8000; 

const allUsers = {};

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// serve page on root hit
app.get("/", (req, res) => {
  res.sendFile("index.html");
});

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

// Dont use app.listen as we needed socket also handled, hence use server.
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
