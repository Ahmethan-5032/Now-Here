import { useCallback, useEffect, useRef, useState } from "react";
import "./Camera.css";

const cameraModes = {
  environment: {
    label: "Arka kamera",
    facingMode: { ideal: "environment" },
  },
  user: {
    label: "On kamera",
    facingMode: { ideal: "user" },
  },
};

export default function Camera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("environment");
  const [switching, setSwitching] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (nextMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayici kamera erisimini desteklemiyor.");
      return;
    }

    setReady(false);
    setSwitching(true);
    setError("");
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraModes[nextMode].facingMode,
          width: { ideal: 1440 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }
      setReady(true);
    } catch (err) {
      setError(err.message || "Kamera acilamadi.");
    } finally {
      setSwitching(false);
    }
  }, [stopStream]);

  useEffect(() => {
    let mounted = true;
    // Camera permissions and stream binding are external browser side effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera(mode).then(() => {
      if (!mounted) stopStream();
    });

    return () => {
      mounted = false;
      stopStream();
    };
  }, [mode, startCamera, stopStream]);

  function closeCamera() {
    stopStream();
    onClose();
  }

  function switchCamera() {
    setMode((current) => (current === "environment" ? "user" : "environment"));
  }

  function capturePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !video.videoWidth) {
      setError("Kamera goruntusu henuz hazir degil.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (mode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.84);
    stopStream();
    onCapture(imageData);
  }

  return (
    <div className="camera-screen">
      {error ? (
        <div className="camera-error">
          <strong>Kamera kullanilamiyor</strong>
          <p>{error}</p>
          <button type="button" onClick={closeCamera}>
            Kapat
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`camera-video ${mode === "user" ? "is-selfie" : ""}`}
          />
          <canvas ref={canvasRef} hidden />

          <div className="camera-hud" aria-live="polite">
            <span>{cameraModes[mode].label}</span>
            <small>{switching ? "Kamera degistiriliyor..." : "Fotografi cekmeden once kadraji sabitle"}</small>
          </div>

          <div className="camera-controls">
            <button type="button" className="camera-secondary" onClick={closeCamera}>
              Vazgec
            </button>
            <button
              type="button"
              className="camera-shutter"
              onClick={capturePhoto}
              disabled={!ready || switching}
              aria-label="Fotograf cek"
            />
            <button
              type="button"
              className="camera-secondary camera-switch"
              onClick={switchCamera}
              disabled={switching}
            >
              Cevir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
