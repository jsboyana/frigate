import React, { useEffect, useRef, useState } from "react";
import "aframe";
import "../../public/VideoViewer.css";
import { baseUrl } from "@/api/baseUrl";

const VideoViewer = ({ Player, streamName }) => {
  const containerRef = useRef();
  const videoRef = useRef();
  const pcRef = useRef();
  const [scale, setScale] = useState(1);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  useEffect(() => {
    let rotationInterval;
    if (isRotating && !isUserInteracting) {
      rotationInterval = setInterval(() => {
        setRotateAngle((prevAngle) => (prevAngle + 0.2) % 360);
      }, 16);
    }

    return () => {
      if (rotationInterval) {
        clearInterval(rotationInterval);
      }
    };
  }, [isRotating, isUserInteracting]);

  const handleMouseDown = () => {
    setIsUserInteracting(true);
    setIsRotating(false);
  };

  const handleMouseUp = () => {
    setIsUserInteracting(false);
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseUp);
    };
  }, []);

  const toggleRotation = () => {
    setIsRotating((prev) => !prev);
    setIsUserInteracting(false);
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3)); // Max zoom 3x
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 1)); // Min zoom 0.5x
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY;
    if (delta < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleTouchMove = (event) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      // Calculate the distance between two fingers
      const currentDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY,
      );

      if (containerRef.current._lastTouchDistance) {
        const delta = containerRef.current._lastTouchDistance - currentDistance;
        if (Math.abs(delta) > 5) {
          // Add a small threshold to prevent tiny movements
          if (delta > 0) {
            handleZoomOut();
          } else {
            handleZoomIn();
          }
        }
      }
      containerRef.current._lastTouchDistance = currentDistance;
    }
  };

  const handleTouchEnd = () => {
    if (containerRef.current) {
      containerRef.current._lastTouchDistance = null;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("touchcancel", handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
      }
    };
  }, []);

  useEffect(() => {
    const setupVideo = () => {
      // Create a video element for the go2rtc stream
      const textureVideo = document.createElement("video");
      textureVideo.id = "videoTexture";
      textureVideo.style.display = "none";
      textureVideo.playsInline = true;
      textureVideo.muted = true;
      textureVideo.crossOrigin = "anonymous";
      textureVideo.autoplay = true;

      // Set the source to the go2rtc stream URL
      const wsUrl = `${baseUrl.replace(/^http/, "ws")}live/webrtc/api/ws?src=${streamName}`;
      console.log("🧑‍💻 ~ setupVideo ~ wsUrl=>>>> ", wsUrl);

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      ws.onopen = async () => {
        console.log("WebSocket connected");
        try {
          const pc = new RTCPeerConnection({
            bundlePolicy: "max-bundle",
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
              videoHeight: textureVideo.videoHeight,
            });

            // Ensure video starts playing
            textureVideo.play().catch((err) => {
              console.error("Error playing video after track:", err);
            });

            // Update A-Frame video texture
            const sphere = document.querySelector("a-videosphere");
            if (sphere) {
              sphere.setAttribute("material", {
                shader: "flat",
                src: textureVideo,
                side: "back",
              });
              console.log("Updated video texture on sphere with live stream");
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log("Sending ICE candidate");
              ws.send(
                JSON.stringify({
                  type: "webrtc/candidate",
                  value: event.candidate.candidate,
                }),
              );
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
          ws.send(
            JSON.stringify({
              type: "webrtc/offer",
              value: pc.localDescription.sdp,
            }),
          );
          console.log("Offer sent");
        } catch (e) {
          console.error("WebRTC setup failed:", e);
        }
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        console.log("Received message:", msg);

        if (msg.type === "webrtc/answer") {
          try {
            await pcRef.current.setRemoteDescription({
              type: "answer",
              sdp: msg.value,
            });
            console.log("Remote description set");
          } catch (e) {
            console.error("Failed to set remote description:", e);
          }
        } else if (msg.type === "webrtc/candidate") {
          try {
            const pc = pcRef.current;
            if (pc) {
              await pc.addIceCandidate({
                candidate: msg.value,
                sdpMid: "0",
              });
              console.log("Added ICE candidate");
            }
          } catch (e) {
            console.error("Failed to add ICE candidate:", e);
          }
        } else if (msg.type === "error") {
          console.error("WebSocket error message:", msg);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      // Append the video element to the DOM
      document.body.appendChild(textureVideo);

      // Add video event listeners for debugging
      textureVideo.addEventListener("loadedmetadata", () => {
        console.log("Video loadedmetadata event");
      });

      textureVideo.addEventListener("playing", () => {
        console.log("Video playing event");

        // Try updating the texture again when playing starts
        const sphere = document.querySelector("a-videosphere");
        if (sphere) {
          sphere.setAttribute("material", {
            shader: "flat",
            src: textureVideo,
            side: "back",
          });
          console.log("Updated video texture on sphere when playing");
        }
      });

      textureVideo.addEventListener("error", (e) => {
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
            tracks.forEach((track) => track.stop());
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
    <div
      className="video-container"
      ref={containerRef}
      style={{ position: "relative" }}
    >
      {/* Original JSMpeg player */}
      <div
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
        }}
        ref={videoRef}
      />
      {/* A-Frame scene */}
      <a-scene
        embedded
        vr-mode-ui="enabled: false"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
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
        <a-videosphere rotation={`0 ${rotateAngle} 0`} />
      </a-scene>
      {/* Zoom Controls */}
      <div
        className="zoom-controls"
        style={{
          position: "absolute",
          bottom: "100px",
          right: "20px",
          zIndex: "1000",
          display: "flex",
          gap: "10px",
          justifyContent: "space-between",
          width: "95%",
        }}
      >
        <div></div>
        {!isRotating ? (
          <button
            onClick={toggleRotation}
            style={{
              width: "50px",
              height: "50px",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50%",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0",
            }}
          >
            {isRotating ? "⏸" : "▶️"}
          </button>
        ) : null}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleZoomOut}
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0",
            }}
          >
            -
          </button>
          <button
            onClick={handleZoomIn}
            style={{
              width: "40px",
              height: "40px",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0",
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;
