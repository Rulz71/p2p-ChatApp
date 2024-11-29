"use strict";

let thisPeerId; // = socket.id
let socket; // instance of io

let localMediaStream;
let remoteMediaStream;

const downloadLink = document.getElementById("downloadLink");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const locationInfo = document.getElementById("locationInfo");

// peerConnections[peerId] ==> ispe sare event slage hue hai like -->
// createOffer, setLocalDescription, setRemoteDescription, onicecandidate, ondatachannel, ontrack

// Parse query parameters
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");
const peerName = params.get("name");
const isAgent = params.get("agent") === "true"; // Check if the user is the agent

const roomURL = window.location.origin + "/?room=" + roomId;

// Show control panel for the agent only
const controlPanel = document.getElementById("controlPanel");
if (isAgent) {
    controlPanel.classList.remove("hidden");
}

// Control button functionality

const endCallBtn = document.getElementById("endCallBtn");

endCallBtn.addEventListener("click", () => {
    endCall();
    //   also tell the other side varna frame forzen rahega
    socket.emit("end-call");
});
document.getElementById("shareLinkBtn").addEventListener("click", () => {
    const roomUrl = `${
        window.location.origin
    }/chatRoom.html?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
        alert("Room link copied to clipboard!");
    });
});

document.getElementById("recordBtn").addEventListener("click", () => {
    alert("Recording functionality not yet implemented.");
});

document.getElementById("screenshotBtn").addEventListener("click", () => {
    // alert("Screenshot functionality not yet implemented.");
    console.log("event listner working");

    takeScreenshot();
});

document
    .getElementById("locationBtn")
    .addEventListener("click", getClientLocation);

downloadLink.addEventListener("click", () => {
    screenshotImage.style.display = "none";
    downloadLink.style.display = "none";
});

const PeerConnection = (function () {
    let peerConnection;

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
            ],
        };
        peerConnection = new RTCPeerConnection(config);

        // add local stream to peer connection( NOT GETTING THEM)
        localMediaStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localMediaStream);
        });
        // listen to remote stream and add them to connection
        peerConnection.ontrack = function (e) {
            remoteVideo.srcObject = e.streams[0];
        };

        // listen for ice candidate
        peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };
        return peerConnection;
    };

    return {
        getInstance: () => {
            //   if connection does not exist create a new one
            // else return the existing one
            if (!peerConnection) {
                peerConnection = createPeerConnection();
            }
            return peerConnection;
        },
    };
})();

document.addEventListener("DOMContentLoaded", function () {
    console.log("Dom loaded");

    // define peer connection on top -- singleton method IFFI

    initClient();
});

async function initClient() {
    console.log("RoomURL", roomURL);
    console.log("Location", window.location);

    console.log("Creating client side of socket");
    socket = io({ transports: ["websocket"] });

    //DOM LOAD hote hi everyone fire event "join-room"
    socket.emit("want-to-join-room", roomId);

    socket.on("room-full", () => {
        socket.disconnect();
        alert("Room is full!");
        window.location.href = "dashboard.html";
    });

    localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    localVideo.srcObject = localMediaStream;

    socket.on("you-have-joined-room", handleRoomJoined);
    socket.on("a-user-joined-your-room", handleUserJoinedMyRoom);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("end-call", endCall);
    socket.on("getClientLocation", shareLocation);
    socket.on("locationData", showClientLocation);

    socket.on("ice-candidate", async (candidate) => {
        try {
            const pc = PeerConnection.getInstance();
            await pc.addIceCandidate(candidate);
        } catch (e) {
            console.error("Error adding received ice candidate", e);
        }
    });
}

async function handleAnswer(answer) {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("handleAnswer function : Both streams should be visible now");
}
async function handleOffer(offer) {
    console.log("function handleOffer");
    console.log("got the offer from peer in room", offer);

    const pc = await PeerConnection.getInstance();
    pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    console.log("prepared my answer for peer in room", answer);

    socket.emit("answer", answer);
}
async function handleRoomJoined() {
    // peer conenction banao, uspe listeners dalo
    // o rapni video dikhao
    console.log("handleRoomJoined");

    console.log("peer connection created", PeerConnection.getInstance());
}
async function handleUserJoinedMyRoom() {
    console.log("handleUserJoinedMyRoom");
    console.log(
        "A user joined my room, so start call amking process ==> make and send an offer"
    );
    const pc = await PeerConnection.getInstance();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("offer created:", offer);

    socket.emit("offer", offer);
}

function endCall() {
    const pc = PeerConnection.getInstance();
    if (pc) {
        pc.close();
        endCallBtn.style.display = "none";
    }
}

function takeScreenshot() {
    console.log("taking screenshot");

    // Get the remote video's dimensions
    const videoWidth = remoteVideo.videoWidth;
    const videoHeight = remoteVideo.videoHeight;

    // Set the canvas size to match the video
    screenshotCanvas.width = videoWidth;
    screenshotCanvas.height = videoHeight;

    // Draw the current video frame onto the canvas
    const ctx = screenshotCanvas.getContext("2d");
    ctx.drawImage(remoteVideo, 0, 0, videoWidth, videoHeight);

    // Convert the canvas content to an image URL
    const imageDataUrl = screenshotCanvas.toDataURL("image/png");

    // Set the image element's source to the captured image
    screenshotImage.src = imageDataUrl;
    screenshotImage.style.display = "block";

    // Set the download link with the image URL and make it visible
    downloadLink.href = imageDataUrl;
    downloadLink.style.display = "inline";
}

function getClientLocation() {
    socket.emit("getClientLocation");
}

function shareLocation(data) {
    console.log("inside shareLocation");

    let locationData = { latitude: null, longitude: null };

    //Dummy one, which will result in a working next statement.
    navigator.geolocation.getCurrentPosition(
        function () {},
        function () {},
        {}
    );
    //The working next statement.
    navigator.geolocation.getCurrentPosition(
        function (position) {
            //Your code here
            console.log("positon is", position);
            console.log("Lat is", position.coords.latitude);
            console.log("Long is", position.coords.longitude);

            locationData.latitude = position.coords.latitude;
            locationData.longitude = position.coords.longitude;

            // Send location data to the server via a separate event
            socket.emit("locationData", locationData);
        },
        function (e) {
            //Your error handling here
            console.log(e);
        },
        {
            enableHighAccuracy: true,
        }
    );
}

function showClientLocation(locationData) {
    console.log("Inside showClientLocation");
    
    console.log(locationData);

    if (locationData.latitude && locationData.longitude) {
        // Display location info on UI
        locationInfo.innerHTML = `Latitude: ${locationData.latitude} <br> Longitude: ${locationData.longitude}`;
    } else {
        locationInfo.innerHTML =
            "Geolocation is not supported by this browser.";
    }
}
