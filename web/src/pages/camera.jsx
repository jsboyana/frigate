import React, { useEffect, useRef } from 'react';
import 'aframe';
import "../../public/VideoViewer.css";
import { baseUrl } from "@/api/baseUrl";

const VideoViewer = ({ Player, streamName }) => {
  const containerRef = useRef();
  const videoRef = useRef();
  const pcRef = useRef();

  useEffect(() => {
    const setupVideo = () => {
      // Create a video element for the go2rtc stream
      const textureVideo = document.createElement('video');
      textureVideo.id = 'videoTexture';
      textureVideo.style.display = 'none';
      textureVideo.playsInline = true;
      textureVideo.muted = true;
      textureVideo.crossOrigin = 'anonymous';
      textureVideo.autoplay = true;

      // Set the source to the go2rtc stream URL
      const wsUrl = `${baseUrl.replace(/^http/, "ws")}live/webrtc/api/ws?src=${streamName}`;
      console.log("🧑‍💻 ~ setupVideo ~ wsUrl=>>>> ", wsUrl);

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = async () => {
        console.log('WebSocket connected');
        try {
          const pc = new RTCPeerConnection({
            bundlePolicy: "max-bundle",
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
          });
          pcRef.current = pc;

          pc.ontrack = (event) => {
            console.log("Received track", event.streams[0]);
            textureVideo.srcObject = event.streams[0];
            
            // Log video element state
            console.log("Video element state:", {
              readyState: textureVideo.readyState,
              paused: textureVideo.paused,
              currentTime: textureVideo.currentTime,
              videoWidth: textureVideo.videoWidth,
              videoHeight: textureVideo.videoHeight
            });

            // Ensure video starts playing
            textureVideo.play().catch(err => {
              console.error("Error playing video after track:", err);
            });

            // Update A-Frame video texture
            const sphere = document.querySelector('a-videosphere');
            if (sphere) {
              sphere.setAttribute('material', {
                shader: 'flat',
                src: textureVideo,
                side: 'back'
              });
              console.log("Updated video texture on sphere with live stream");
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log("Sending ICE candidate");
              ws.send(JSON.stringify({
                type: "webrtc/candidate",
                value: event.candidate.candidate
              }));
            }
          };

          pc.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", pc.iceConnectionState);
          };

          // Add transceivers for receiving video and audio
          pc.addTransceiver("video", { direction: "recvonly" });
          pc.addTransceiver("audio", { direction: "recvonly" });

          // Create and set local description
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("Local description set");

          // Send offer
          ws.send(JSON.stringify({
            type: "webrtc/offer",
            value: pc.localDescription.sdp
          }));
          console.log("Offer sent");

        } catch (e) {
          console.error('WebRTC setup failed:', e);
        }
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        console.log("Received message:", msg);

        if (msg.type === "webrtc/answer") {
          try {
            await pcRef.current.setRemoteDescription({
              type: "answer",
              sdp: msg.value
            });
            console.log("Remote description set");
          } catch (e) {
            console.error('Failed to set remote description:', e);
          }
        } else if (msg.type === "webrtc/candidate") {
          try {
            const pc = pcRef.current;
            if (pc) {
              await pc.addIceCandidate({ 
                candidate: msg.value,
                sdpMid: "0"
              });
              console.log("Added ICE candidate");
            }
          } catch (e) {
            console.error('Failed to add ICE candidate:', e);
          }
        } else if (msg.type === "error") {
          console.error("WebSocket error message:", msg);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Append the video element to the DOM
      document.body.appendChild(textureVideo);

      // Add video event listeners for debugging
      textureVideo.addEventListener('loadedmetadata', () => {
        console.log("Video loadedmetadata event");
      });

      textureVideo.addEventListener('playing', () => {
        console.log("Video playing event");
        
        // Try updating the texture again when playing starts
        const sphere = document.querySelector('a-videosphere');
        if (sphere) {
          sphere.setAttribute('material', {
            shader: 'flat',
            src: textureVideo,
            side: 'back'
          });
          console.log("Updated video texture on sphere when playing");
        }
      });

      textureVideo.addEventListener('error', (e) => {
        console.error("Video error:", e);
      });

      // Cleanup function
      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        if (textureVideo) {
          if (textureVideo.srcObject) {
            const tracks = textureVideo.srcObject.getTracks();
            tracks.forEach(track => track.stop());
          }
          textureVideo.pause();
          textureVideo.srcObject = null;
          textureVideo.remove();
        }
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = undefined;
        }
      };
    };

    // Give some time for the DOM to initialize
    const timeoutId = setTimeout(setupVideo, 1000);
    return () => clearTimeout(timeoutId);
  }, [streamName]);

  return (
    <div className="video-container" ref={containerRef}>
      {/* Original JSMpeg player */}
      <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {Player}
      </div>

      {/* A-Frame Scene */}
      <div dangerouslySetInnerHTML={{
        __html: `
          <a-scene embedded vr-mode-ui="enabled: false">
            <a-videosphere 
              rotation="0 -90 0"
              material="shader: flat; side: back"
            ></a-videosphere>
            <a-entity 
              position="0 1.6 0"
              camera
              look-controls="reverseMouseDrag: true; touchEnabled: true"
              wasd-controls="enabled: false"
            >
              <a-entity 
                cursor="fuse: false"
                raycaster="objects: .clickable"
                position="0 0 -1"
              ></a-entity>
            </a-entity>
          </a-scene>
        `
      }} />
    </div>
  );
};

export default VideoViewer;
