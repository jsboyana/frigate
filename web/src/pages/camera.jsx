import React, { useEffect, useRef, useState } from "react";
import "aframe";
import "../../public/VideoViewer.css";

const VideoViewer = () => {
  const videoRef = useRef(null);
  const sceneRef = useRef(null);
  const [isFlat, setIsFlat] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);

  const enterVR = () => {
    const scene = document.querySelector("a-scene");
    if (scene) {
      if (scene.is("vr-mode")) {
        scene.exitVR();
      } else {
        scene.enterVR();
      }
    }
  };

  const toggleView = () => {
    setIsFlat(!isFlat);
    setAutoRotateEnabled(true); // Reset auto-rotation when switching to 360 view
  };

  useEffect(() => {
    // Start video autoplay when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log("Autoplay prevented:", error);
      });
    }

    let animationFrame;
    let lastRotation = 0;

    const updateRotation = () => {
      if (!autoRotateEnabled || isFlat) return;

      // Rotate the camera in 360 mode
      const camera = document.querySelector("a-camera");
      if (camera) {
        lastRotation = (lastRotation + 0.1) % 360;
        camera.setAttribute("rotation", `0 ${lastRotation} 0`);
        animationFrame = requestAnimationFrame(updateRotation);
      }
    };

    // Start auto-rotation only in 360 mode
    if (!isFlat) {
      updateRotation();

      // Stop auto-rotation on mouse/touch interaction
      const stopAutoRotation = () => {
        setAutoRotateEnabled(false);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };

      const scene = document.querySelector("a-scene");
      if (scene) {
        scene.addEventListener("mousedown", stopAutoRotation);
        scene.addEventListener("touchstart", stopAutoRotation);
      }

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        if (scene) {
          scene.removeEventListener("mousedown", stopAutoRotation);
          scene.removeEventListener("touchstart", stopAutoRotation);
        }
      };
    }
  }, [isFlat, autoRotateEnabled]);

  if (isFlat) {
    return (
      <div className="video-container flat-mode">
        <div className="controls">
          <button onClick={toggleView}>Switch to 360° View</button>
        </div>
        <div className="video-wrapper">
          <video
            ref={videoRef}
            src="../../public/video/office.mp4"
            className="flat-video"
            autoPlay
            loop
            playsInline
            muted
          />
        </div>
      </div>
    );
  }

  return (
    <div className="video-container">
      <div className="controls">
        <button onClick={toggleView}>Switch to Flat View</button>
        <button onClick={enterVR}>Enter VR</button>
      </div>

      <a-scene ref={sceneRef}>
        <a-assets>
          <video
            id="video"
            ref={videoRef}
            src="../../public/video/office.mp4"
            crossOrigin="anonymous"
            loop
            autoPlay
            playsInline
            muted
          />
        </a-assets>

        <a-videosphere src="#video" rotation="0 -90 0" />

        <a-camera position="0 1.6 0" look-controls="reverseMouseDrag: true" />
      </a-scene>
    </div>
  );
};

export default VideoViewer;
