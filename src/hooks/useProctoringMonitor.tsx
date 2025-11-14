import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as faceDetection from "@tensorflow-models/face-detection";
import * as faceapi from "@vladmandic/face-api";
import { supabase } from "@/integrations/supabase/client";

interface ProctoringEvent {
  eventType: string;
  details: string;
  timestamp: Date;
}

interface UseProctoringMonitorProps {
  mockInterviewId: string | null;
  isActive: boolean;
  onViolation: (message: string, severity: "warning" | "critical", violationCount?: number, violationType?: string) => void;
  onTerminate: () => void;
  onScreenShareRequired?: () => void;
  violationLimit?: number;
  gazeThresholds?: {
    horizontalThreshold: number;
    verticalThreshold: number;
  };
}

export const useProctoringMonitor = ({
  mockInterviewId,
  isActive,
  onViolation,
  onTerminate,
  onScreenShareRequired,
  violationLimit = 5,
  gazeThresholds
}: UseProctoringMonitorProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const detectorRef = useRef<faceDetection.FaceDetector | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const lastFaceCheckRef = useRef<number>(0);
  const lastNoiseWarningRef = useRef<number>(0);
  const lastIdentityCheckRef = useRef<number>(0);
  const gazeAwayStartRef = useRef<number | null>(null);
  const lastGazeCheckRef = useRef<number>(0);

  // Handle violation with counter
  const handleViolation = useCallback((
    eventType: string,
    details: string,
    increment: number = 1,
    message: string
  ) => {
    const newCount = violationCount + increment;
    setViolationCount(newCount);

    // Log event with violation count
    logEvent(eventType, `${details} | Violation count: ${newCount}/${violationLimit}`);

    // Determine severity
    const severity = newCount > violationLimit ? "critical" : "warning";
    
    // Show warning with count
    onViolation(message, severity, newCount, eventType);

    // Auto-terminate if limit exceeded
    if (newCount > violationLimit) {
      setTimeout(() => {
        logEvent("session_terminated", `Violation limit exceeded (${newCount}/${violationLimit}) - session terminated`);
        onTerminate();
      }, 3000);
    }
  }, [violationCount, violationLimit, onViolation, onTerminate]);

  // Log proctoring event
  const logEvent = useCallback(async (eventType: string, details: string) => {
    if (!mockInterviewId) return;

    try {
      await supabase.from("proctoring_logs").insert({
        mock_interview_id: mockInterviewId,
        event_type: eventType,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log proctoring event:", error);
    }
  }, [mockInterviewId]);

  // Initialize face detection and recognition models
  useEffect(() => {
    const initDetector = async () => {
      try {
        await tf.ready();
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
          runtime: "tfjs" as const,
          maxFaces: 5,
        };
        detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
        console.log("Face detector initialized");

        // Load face-api models for facial recognition
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setFaceApiLoaded(true);
        console.log("Face recognition models loaded");
      } catch (error) {
        console.error("Failed to initialize models:", error);
      }
    };

    if (isActive) {
      initDetector();
    }

    return () => {
      detectorRef.current?.dispose();
    };
  }, [isActive]);

  // Full-screen monitoring
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);

      if (!isFS && isActive && isMonitoring) {
        handleViolation(
          "fullscreen_exit",
          "User exited full-screen mode",
          1,
          `Please return to full-screen immediately. Violations: ${violationCount + 1}/${violationLimit}`
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, [isActive, isMonitoring, violationCount, violationLimit, handleViolation]);

  // Tab/window visibility monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive && isMonitoring) {
        handleViolation(
          "tab_switch",
          "User switched tabs or minimized window",
          1,
          `Stay focused on the interview. Violations: ${violationCount + 1}/${violationLimit}`
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, isMonitoring, violationCount, violationLimit, handleViolation]);

  // Eye tracking / gaze detection
  const checkGazeDirection = useCallback((faces: faceDetection.Face[]) => {
    if (faces.length !== 1) return;

    const face = faces[0];
    const keypoints = face.keypoints;
    if (!keypoints) return;

    // Get eye keypoints (MediaPipe provides left and right eye positions)
    const leftEye = keypoints.find(kp => kp.name === "leftEye");
    const rightEye = keypoints.find(kp => kp.name === "rightEye");
    const noseTip = keypoints.find(kp => kp.name === "noseTip");

    if (!leftEye || !rightEye || !noseTip) return;

    // Calculate eye center
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    // Calculate gaze deviation (relative to nose position)
    const horizontalDeviation = Math.abs(eyeCenterX - noseTip.x);
    const verticalDeviation = Math.abs(eyeCenterY - noseTip.y);

    // Use calibrated thresholds or defaults
    const HORIZONTAL_THRESHOLD = gazeThresholds?.horizontalThreshold || 30;
    const VERTICAL_THRESHOLD = gazeThresholds?.verticalThreshold || 25;
    const GAZE_AWAY_DURATION = 5000; // 5 seconds

    const isLookingAway = horizontalDeviation > HORIZONTAL_THRESHOLD || verticalDeviation > VERTICAL_THRESHOLD;

    const now = Date.now();

    if (isLookingAway) {
      if (gazeAwayStartRef.current === null) {
        gazeAwayStartRef.current = now;
      } else {
        const gazeAwayDuration = now - gazeAwayStartRef.current;
        
        if (gazeAwayDuration > GAZE_AWAY_DURATION && now - lastGazeCheckRef.current > 3000) {
          lastGazeCheckRef.current = now;
          handleViolation(
            "gaze_away",
            `Candidate looking away from screen for ${Math.round(gazeAwayDuration / 1000)}s`,
            1,
            `Please focus on the screen. Violations: ${violationCount + 1}/${violationLimit}`
          );
        }
      }
    } else {
      // Reset if looking back at screen
      gazeAwayStartRef.current = null;
    }
  }, [violationCount, violationLimit, handleViolation, gazeThresholds]);

  // Verify face identity using facial recognition
  const verifyFaceIdentity = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!faceApiLoaded || !mockInterviewId) return;

    const now = Date.now();
    // Check identity every 10 seconds
    if (now - lastIdentityCheckRef.current < 10000) return;
    lastIdentityCheckRef.current = now;

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log("No face descriptor extracted for identity check");
        return;
      }

      const currentEmbedding = Array.from(detection.descriptor);

      const { data, error } = await supabase.functions.invoke("compare-face-embeddings", {
        body: { currentEmbedding, mockInterviewId }
      });

      if (error) {
        console.error("Error comparing face embeddings:", error);
        return;
      }

      if (!data.isMatch) {
        handleViolation(
          "identity_mismatch",
          `Face does not match registered identity (distance: ${data.distance})`,
          2,
          `Identity verification failed. Violations: ${violationCount + 2}/${violationLimit}`
        );
      } else {
        console.log(`Identity verified - Distance: ${data.distance}`);
      }
    } catch (error) {
      console.error("Face identity verification error:", error);
    }
  }, [faceApiLoaded, mockInterviewId, violationCount, violationLimit, handleViolation]);

  // Face detection monitoring
  const checkFaces = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!detectorRef.current || !isActive) return;

    const now = Date.now();
    // Check every 3 seconds to avoid performance issues
    if (now - lastFaceCheckRef.current < 3000) return;
    lastFaceCheckRef.current = now;

    try {
      const faces = await detectorRef.current.estimateFaces(videoElement);
      
      if (faces.length === 0) {
        logEvent("no_face_detected", "No face detected in camera feed");
        onViolation(
          "No face detected. Please ensure your face is visible to the camera.",
          "warning",
          violationCount
        );
        // Reset gaze tracking when no face
        gazeAwayStartRef.current = null;
      } else if (faces.length > 1) {
        // Multiple faces - more severe, increment by 2
        handleViolation(
          "multiple_faces",
          `${faces.length} faces detected in frame`,
          2,
          `Only you should be visible. Violations: ${violationCount + 2}/${violationLimit}`
        );
        gazeAwayStartRef.current = null;
      } else if (faces.length === 1) {
        // Check gaze direction for eye tracking
        checkGazeDirection(faces);
        
        // Verify identity when single face detected
        verifyFaceIdentity(videoElement);
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, [isActive, violationCount, violationLimit, onViolation, logEvent, handleViolation, verifyFaceIdentity, checkGazeDirection]);

  // Background noise and multiple voice detection
  const monitorAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Track previous audio patterns for voice detection
      let previousSpeechEnergy = 0;
      let voiceActivityCount = 0;

      const checkNoise = () => {
        if (!isActive) return;

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate overall energy
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        // Analyze human speech frequency ranges
        // Human voice fundamental: 85-255 Hz (bins ~3-10 at 44.1kHz sample rate)
        // Human voice formants: 500-2000 Hz (bins ~20-80)
        const sampleRate = audioContext.sampleRate;
        const binWidth = sampleRate / analyser.fftSize;
        
        const speechLowStart = Math.floor(85 / binWidth);
        const speechLowEnd = Math.floor(255 / binWidth);
        const speechMidStart = Math.floor(500 / binWidth);
        const speechMidEnd = Math.floor(2000 / binWidth);
        
        // Calculate energy in speech frequency bands
        let speechLowEnergy = 0;
        let speechMidEnergy = 0;
        
        for (let i = speechLowStart; i < speechLowEnd && i < bufferLength; i++) {
          speechLowEnergy += dataArray[i];
        }
        for (let i = speechMidStart; i < speechMidEnd && i < bufferLength; i++) {
          speechMidEnergy += dataArray[i];
        }
        
        speechLowEnergy /= (speechLowEnd - speechLowStart);
        speechMidEnergy /= (speechMidEnd - speechMidStart);
        
        const totalSpeechEnergy = (speechLowEnergy + speechMidEnergy) / 2;
        
        // Detect voice activity based on speech-band energy
        const SPEECH_THRESHOLD = 80;
        const isVoiceActive = totalSpeechEnergy > SPEECH_THRESHOLD;
        
        if (isVoiceActive) {
          voiceActivityCount++;
        } else {
          voiceActivityCount = Math.max(0, voiceActivityCount - 1);
        }
        
        // Detect multiple speakers based on energy variation patterns
        // Multiple voices create more erratic energy patterns
        const energyVariation = Math.abs(totalSpeechEnergy - previousSpeechEnergy);
        previousSpeechEnergy = totalSpeechEnergy;
        
        const now = Date.now();
        
        // High voice activity with erratic patterns suggests multiple speakers
        if (voiceActivityCount > 10 && energyVariation > 30 && now - lastNoiseWarningRef.current > 10000) {
          lastNoiseWarningRef.current = now;
          handleViolation(
            "multiple_voices",
            `Multiple voices detected (speech energy: ${Math.round(totalSpeechEnergy)}, variation: ${Math.round(energyVariation)})`,
            2,
            `Multiple people detected. Only you should be present. Violations: ${violationCount + 2}/${violationLimit}`
          );
          voiceActivityCount = 0; // Reset after flagging
        }
        // General background noise detection
        else if (average > 150 && voiceActivityCount < 5 && now - lastNoiseWarningRef.current > 10000) {
          lastNoiseWarningRef.current = now;
          handleViolation(
            "background_noise",
            `Unusual audio detected (level: ${Math.round(average)})`,
            1,
            `Background noise detected. Ensure quiet environment. Violations: ${violationCount + 1}/${violationLimit}`
          );
        }

        if (isActive) {
          requestAnimationFrame(checkNoise);
        }
      };

      checkNoise();
    } catch (error) {
      console.error("Audio monitoring error:", error);
    }
  }, [isActive, violationCount, violationLimit, handleViolation]);

  // Screen sharing monitoring
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor"
        }
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      logEvent("screen_share_started", "Screen sharing activated");

      // Monitor for screen share ending
      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        if (isActive) {
          handleViolation(
            "screen_share_ended",
            "Screen sharing stopped by user",
            1,
            `Screen sharing is required. Violations: ${violationCount + 1}/${violationLimit}`
          );
        }
      };

      return true;
    } catch (error) {
      console.error("Failed to start screen sharing:", error);
      onViolation(
        "Screen sharing is required to continue. Interview cannot proceed.",
        "critical",
        violationLimit + 1
      );
      return false;
    }
  }, [isActive, violationCount, violationLimit, onViolation, logEvent, handleViolation]);

  // Start monitoring
  const startMonitoring = useCallback(async (videoElement: HTMLVideoElement) => {
    videoElementRef.current = videoElement;
    setIsMonitoring(true);

    // Request full-screen
    try {
      await document.documentElement.requestFullscreen();
      logEvent("monitoring_started", "Proctoring monitoring activated");
    } catch (error) {
      console.error("Failed to enter full-screen:", error);
    }

    // Start screen sharing
    const screenShareSuccess = await startScreenShare();
    if (!screenShareSuccess) {
      setTimeout(onTerminate, 3000);
      return;
    }

    // Start audio monitoring
    monitorAudio();

    // Start face detection loop
    const faceCheckInterval = setInterval(() => {
      if (videoElement && isActive) {
        checkFaces(videoElement);
      }
    }, 3000);

    return () => {
      clearInterval(faceCheckInterval);
    };
  }, [isActive, checkFaces, monitorAudio, startScreenShare, onTerminate, logEvent]);

  // Stop monitoring and cleanup all resources
  const stopMonitoring = useCallback(() => {
    console.log('Stopping proctoring monitoring and cleaning up resources...');
    setIsMonitoring(false);
    setIsScreenSharing(false);
    
    // Exit full-screen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }

    // Stop screen sharing
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped screen share track:', track.kind);
      });
      screenStreamRef.current = null;
    }

    // Stop audio monitoring
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    logEvent("monitoring_stopped", "Proctoring monitoring deactivated and resources released");
  }, [logEvent]);

  return {
    isFullScreen,
    isMonitoring,
    isScreenSharing,
    violationCount,
    violationLimit,
    startMonitoring,
    stopMonitoring
  };
};
