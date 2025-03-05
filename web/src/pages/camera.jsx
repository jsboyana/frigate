import React, { useEffect, useRef } from 'react';
import 'aframe';
import "../../public/VideoViewer.css";

const VideoViewer = ({ Player }) => {
  const containerRef = useRef();
  const videoRef = useRef();

  useEffect(() => {
    const setupVideo = () => {
      // Wait for JSMpeg player to be ready
      const jsmpegPlayer = document.querySelector('.jsmpeg');
      if (!jsmpegPlayer) {
        console.log("JSMpeg player not found, retrying...");
        setTimeout(setupVideo, 100);
        return;
      }

      // Find the canvas element inside JSMpeg player
      const canvas = jsmpegPlayer.querySelector('canvas');
      if (!canvas) {
        console.log("Canvas not found, retrying...");
        setTimeout(setupVideo, 100);
        return;
      }

      console.log("Found JSMpeg canvas");
      videoRef.current = canvas;

      // Create a video texture from the canvas
      const textureVideo = document.createElement('video');
      textureVideo.id = 'videoTexture';
      textureVideo.style.display = 'none';
      document.body.appendChild(textureVideo);

      // Create a MediaStream from the canvas
      const stream = canvas.captureStream(30); // 30 FPS
      textureVideo.srcObject = stream;
      textureVideo.playsInline = true;
      textureVideo.muted = true;
      textureVideo.crossOrigin = 'anonymous';

      // Update the videosphere when ready
      textureVideo.addEventListener('canplay', () => {
        const sphere = document.querySelector('a-videosphere');
        if (sphere) {
          sphere.setAttribute('src', '#videoTexture');
          console.log("Video texture updated");
        }
      });

      // Start playing the video
      textureVideo.play().catch(err => {
        console.error("Error playing video:", err);
      });
    };

    // Give JSMpeg time to initialize
    setTimeout(setupVideo, 1000);

    // Cleanup
    return () => {
      const textureVideo = document.getElementById('videoTexture');
      if (textureVideo) {
        const stream = textureVideo.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        textureVideo.pause();
        textureVideo.srcObject = null;
        textureVideo.remove();
      }
    };
  }, []);

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
