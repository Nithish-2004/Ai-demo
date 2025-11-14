import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VideoRecorderProps {
  isRecording: boolean;
  onVideoRecorded: (blob: Blob, transcript: string, duration: number) => void;
  permissionsGranted: boolean;
  shouldCleanup?: boolean;
}

export const VideoRecorder = ({ isRecording, onVideoRecorded, permissionsGranted, shouldCleanup }: VideoRecorderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanupStream = () => {
    console.log('Cleaning up camera and microphone streams...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`✓ Released ${track.kind} device (${track.label})`);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  useEffect(() => {
    if (permissionsGranted && !stream) {
      initializeCamera();
    }

    return cleanupStream;
  }, [permissionsGranted]);

  // Cleanup when shouldCleanup flag is set
  useEffect(() => {
    if (shouldCleanup) {
      console.log('Cleanup triggered by parent');
      cleanupStream();
    }
  }, [shouldCleanup]);

  useEffect(() => {
    if (isRecording && stream) {
      startRecording();
    } else if (!isRecording && mediaRecorderRef.current?.state === 'recording') {
      stopRecording();
    }
  }, [isRecording, stream]);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    startTimeRef.current = Date.now();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // For now, pass empty transcript (could integrate speech-to-text here)
      onVideoRecorded(blob, '', duration);
    };

    mediaRecorder.start(1000); // Collect data every second
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      
      {isRecording && (
        <motion.div
          className="absolute inset-0 border-4 border-destructive rounded-lg pointer-events-none"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {!permissionsGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground text-center px-4">
            Click "Start Recording" to enable camera access
          </p>
        </div>
      )}
    </div>
  );
};