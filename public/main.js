var socket = io();

// get required elements
const allUsersContainer = document.getElementById("allusers");
const userField = document.getElementById("username");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const createUserBtn = document.getElementById("create-user");
const endCallBtn = document.getElementById("end-call-btn");
const startRecBtn = document.getElementById("start-recording");
const stopRecBtn = document.getElementById("stop-recording");
const downloadButton = document.getElementById("download-btn");
const screenshotButton = document.getElementById("screenshot-btn");
const downloadLink = document.getElementById("downloadLink");
const getLocationBtn = document.getElementById("location-btn");

let localStream;
let userName;
let remotePeerId;

let recordedBlobs;
let mediaRecorder;

const locationInfo = document.getElementById("locationInfo");

// define peer connection on top -- singleton method IFFI
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
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    // listen to remote stream and add them to connection
    peerConnection.ontrack = function (e) {
      remoteVideo.srcObject = e.streams[0];
    };

    // listen for ice candidate
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
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

// handle browser events
createUserBtn.addEventListener("click", (e) => {
  // Now dont show the create user options
  document.querySelector(".username-input").style.display = "none";
  // emit event of user:joined to backend
  userName = userField.value;
  //   socket.emit("user:joined", {userName: userName,socketId: socket.id});
  //   No need to send socket.is as it is same on backend and frontend
  socket.emit("user:joined", { userName: userName });
});
endCallBtn.addEventListener("click", (e) => {
  // endcall
  endCall();
  // send event to peer so that it can also end connection from its side
  // varna frozen frame on other side
  socket.emit("call-ended", { fromId: socket.id, toId: remotePeerId });
});
startRecBtn.addEventListener("click", (e) => {
  // hide recording button
  startRecBtn.style.display = "none";
  // show stop recording button
  stopRecBtn.style.display = "inline-block";
  // handleRecording function
  startRecording();
});
stopRecBtn.addEventListener("click", (e) => {
  stopRecording();
});
downloadButton.addEventListener("click", () => {
  const blob = new Blob(recordedBlobs, {
    type: "video/webm",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "test.webm";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    downloadButton.style.display = "none";
  }, 100);
});
downloadLink.addEventListener("click", () => {
  screenshotImage.style.display = "none";
});
screenshotButton.addEventListener("click", takeScreenshot);
getLocationBtn.addEventListener("click", getClientLocation);

// handle socket events

socket.on("user:joined", (data) => {
  const allUsers = data;

  // now display all users in the sidebar, along with phone and you
  const keys = Object.keys(allUsers);
  // console.log(keys);

  // Clear the allUsersContainer, else repeated addon
  allUsersContainer.innerHTML = "";

  for (let i = 0; i < keys.length; i++) {
    const thisUser = allUsers[keys[i]];
    const id = thisUser.id;
    const name = thisUser.name;

    const li = document.createElement("li");
    li.textContent = `${name} ${name === userName ? "(You)" : ""}`;

    // only provide call option to others
    if (name !== userName) {
      const button = document.createElement("button");
      button.classList.add("call-btn");
      button.addEventListener("click", (e) => {
        startCall(thisUser);
        // console.log("Starting Call");
      });
      const img = document.createElement("img");
      img.setAttribute("src", "/images/phone.png");
      img.setAttribute("width", 20);
      button.appendChild(img);
      li.appendChild(button);
    }

    allUsersContainer.appendChild(li);
  }
});

socket.on("offer", handleOffer);
socket.on("answer", handleAnswer);
socket.on("showEndCallBtn", (data) => {
  endCallBtn.style.display = "block";
});
socket.on("call-ended", (data) => {
  endCall();
});
socket.on("icecandidate", async (data) => {
  const { candidate, from } = data;
  console.log("Got ice candidate from", from, "Candidate is", candidate);
  const pc = PeerConnection.getInstance();
  //   addIceCandidate method returns a promise
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});
socket.on("getClientLocation", shareLocation);
socket.on("locationData", showClientLocation);

//handlerFunctions
async function startCall(user) {
  console.log("Calling User: ", user.name);

  const pc = PeerConnection.getInstance();
  // create offer
  const offer = await pc.createOffer();
  // console.log("Offer created is", offer);

  // set local description
  await pc.setLocalDescription(offer);
  // emit offer
  socket.emit("offer", { fromId: socket.id, toId: user.id, offer: offer });
}
async function handleOffer(data) {
  const { fromId, offer } = data;
  console.log("got offer at frontend", fromId, offer);

  const pc = PeerConnection.getInstance();
  //set remote description from offer
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  // create answer and set as local description
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // emit answer to fromId
  // console.log('Created answer for offer', answer);
  socket.emit("answer", { fromId: socket.id, toId: fromId, answer: answer });
}
async function handleAnswer(data) {
  const { fromId, answer } = data;
  // set remote description
  remotePeerId = fromId;
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  console.log("Both streams should be visible now");
  // show end call button and send event so that
  // other side can also show the button
  // Also show the Start-recording Button
  // also show the screenshot btn
  startRecBtn.style.display = "inline-block";
  endCallBtn.style.display = "inline-block";
  screenshotButton.style.display = "inline-block";
  getLocationBtn.style.display = "inline-block";

  socket.emit("showEndCallBtn", { fromId: socket.id, toId: fromId });
}

function stopRecording() {
  mediaRecorder.stop();
  // disable the stop recording button
  startRecBtn.style.display = "none";
  // show the download button
  downloadButton.style.display = "inline-block";
}
function endCall() {
  const pc = PeerConnection.getInstance();
  if (pc) {
    pc.close();
    endCallBtn.style.display = "none";
  }
}

function handleDataAvailable(event) {
  console.log("handleDataAvailable", event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

async function startRecording() {
  console.log("Call recording started");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  recordedBlobs = [];
  let options = {
    mimeType: "video/webm;codecs=vp9,opus",
  };

  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.error("Exception while creating MediaRecorder:", e);
    return;
  }

  mediaRecorder.onstop = (event) => {
    console.log("Recorder stopped: ", event);
    console.log("Recorded Blobs: ", recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log("MediaRecorder started", mediaRecorder);
}

function takeScreenshot() {
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
  // send event to server to get location
  console.log("Inside getClientLocation");
  socket.emit("getClientLocation", { fromId: socket.id, toId: remotePeerId });
}

function shareLocation(data) {
  console.log("inside shareLocation");

  const { fromId, toId } = data;
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
      socket.emit("locationData", {
        locationData: locationData,
        fromId: socket.id,
        toId: fromId,
      });
    },
    function (e) {
      //Your error handling here
      console.log(e);
    },
    {
      enableHighAccuracy: true,
    }
  );

  // Here location is coming as null and null, dont know the issue.
  console.log(
    "got the following location",
    locationData.latitude,
    locationData.longitude
  );
}

function showClientLocation(data) {
  console.log("Inside showClientLocation");

  const { locationData, fromId, toId } = data;
  console.log(data);

  if (locationData.latitude && locationData.longitude) {
    // Display location info on UI
    locationInfo.innerHTML = `Latitude: ${locationData.latitude} <br> Longitude: ${locationData.longitude}`;
  } else {
    locationInfo.innerHTML = "Geolocation is not supported by this browser.";
  }
}
// start application
const startMyVideo = async function () {
  console.log("starting my video");

  // show your video feed. bas??
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log("Got local stream:", localStream);
    localVideo.srcObject = localStream;
  } catch (error) {
    console.log(error);
  }
};
startMyVideo();
