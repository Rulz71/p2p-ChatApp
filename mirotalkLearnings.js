// DATA structures used
const channels = {}; //?
const sockets = {}; //?
const peers = {}; //?

/* 
channels = {
  "room1": { "socket1": <socketObject1>, "socket2": <socketObject2> },
  "room2": { "socket3": <socketObject3> }
};

sockets = {
  "socket1": <socketObject1>,
  "socket2": <socketObject2>
};

peers = {
  "room1": {
    "socket1": { peerName: "Alice", peerVideo: true, peerAudio: true },
    "socket2": { peerName: "Bob", peerVideo: false, peerAudio: true }
  },
  "room2": {
    "socket3": { peerName: "Charlie", peerVideo: true, peerAudio: true }
  }
};

*/

// WHAT ALL INFO TO SEND TO SERVER
function joinToChannel() {
  console.log("Join to channel", roomId);
  sendToServer("join", {
    
    channel: roomId,
    
    peerInfo: {
      peerName: peerName,
      peerVideo: isVideoStreaming,
      peerAudio: isAudioStreaming,
      peerScreen: isScreenStreaming,
      osName: osName,
      osVersion: osVersion,
      browserName: browserName,
      browserVersion: browserVersion,
    },
    
    peerDevice: {
      userAgent: userAgent,
      isWebRTCSupported: isWebRTCSupported,
      isMobileDevice: isMobileDevice,
      isTabletDevice: isTabletDevice,
      isIPadDevice: isIPadDevice,
      isDesktopDevice: isDesktopDevice,
    },
  });
  
  playSound("join");

}

// UA PARSER
const parser = new UAParser();
const result = parser.getResult();
const osName = result.os.name;
const osVersion = result.os.version;
const browserName = result.browser.name;
const browserVersion = result.browser.version;

// TO CHECK TYPE OF USER DEVICE
userAgent = navigator.userAgent.toLowerCase();
isMobileDevice = isMobile(userAgent);
isTabletDevice = isTablet(userAgent);
isIPadDevice = isIpad(userAgent);
isDesktopDevice = isDesktop();
function isMobile(userAgent) {
  return !!/Android|webOS|iPhone|iPad|iPod|BB10|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(
    userAgent || ""
  );
}

function isTablet(userAgent) {
  return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
    userAgent
  );
}

function isIpad(userAgent) {
  return /macintosh/.test(userAgent) && "ontouchend" in document;
}

function isDesktop() {
  return !isMobileDevice && !isTabletDevice && !isIPadDevice;
}
