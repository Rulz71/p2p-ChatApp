const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const allUsers = {};

// what all do i need?
// room functionality
// adminList
// callQueue

// Load SSL/TLS Certificates
const options = {
    key: fs.readFileSync("./certificates/server.key"),
    cert: fs.readFileSync("./certificates/server.crt"),
};

// Serve Static Files (e.g., frontend code in the 'public' folder)
app.use(express.static("public"));

// Create HTTPS Server
const httpsServer = https.createServer(options, app);

// Initialize Socket.IO on the HTTPS server
const io = new Server(httpsServer);

// Middleware to parse JSON data
app.use(express.json());

// serve page on root hit
app.get("/", (req, res) => {
    res.send("Server Running");
});

app.get("/agent", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Start HTTPS Server
const PORT = 3000;
httpsServer.listen(PORT, "0.0.0.0", () => {
    console.log(`HTTPS Socket.IO server running at https://localhost:${PORT}`);
});

// #### //

/* 

roomList = {
  "room1": { "socket1": <socketObject1>, "socket2": <socketObject2> },
  "room2": { "socket3": <socketObject3> }
};

socketList = {
  "socket1": <socketObject1>,
  "socket2": <socketObject2>
};

peerList = {
  "room1": {
    "socket1": { peerName: "Alice" },
    "socket2": { peerName: "Bob" }
  },
  "room2": {
    "socket3": { peerName: "Charlie" }
  }
};

*/

roomList = {};
socketList = {};
peerList = {};

const rooms = {}; // Keeps track of rooms and their participants

io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on("want-to-join-room", (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        if (rooms[roomId].length >= 2) {
            socket.emit("room-full");
            return;
        }

        socket.join(roomId);
        rooms[roomId].push(socket.id);
        console.log(`User ${socket.id} joined room ${roomId}`);
        console.log("the rooms data:", rooms);

        socket.emit("you-have-joined-room", roomId);

        // Notify others in the room that a new user joined
        socket.to(roomId).emit("a-user-joined-your-room", socket.id);

        // Handle WebRTC signaling
        socket.on("offer", (offer) => {
            //   send offer to room
            socket.to(roomId).emit("offer", offer);
            //   console.log("offer received at backend", offer);
        });

        socket.on("answer", (answer) => {
            //   console.log("got answer at the backend", answer);

            socket.to(roomId).emit("answer", answer);
        });

        socket.on("ice-candidate", (candidate) => {
            socket.to(roomId).emit("ice-candidate", candidate);
        });

        socket.on("end-call", () => {
            socket.to(roomId).emit("end-call");
        });

        // Handle user disconnection
        socket.on("disconnect", () => {
            console.log(`User ${socket.id} disconnected`);
            rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
            socket.to(roomId).emit("user-left", socket.id);

            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }

            console.log("the rooms data:", rooms);
        });

        socket.on("getClientLocation", () => {
            socket.to(roomId).emit("getClientLocation");
        });

        socket.on("locationData", (locationData) => {
            socket.to(roomId).emit("locationData", locationData);
        });

        socket.on("error", (err) => {
            console.error(`Error on socket ${socket.id}:`, err);
        });
    });
});
