import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Target, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as faceDetection from "@tensorflow-models/face-detection";
import * as tf from "@tensorflow/tfjs";

interface CalibrationPoint {
  x: number;
  y: number;
  label: string;
}

interface CalibrationData {
  horizontalThreshold: number;
  verticalThreshold: number;
}

interface GazeCalibrationProps {
  videoElement: HTMLVideoElement | null;
  onComplete: (data: CalibrationData) => void;
  onSkip: () => void;
}

const calibrationPoints: CalibrationPoint[] = [
  { x: 50, y: 50, label: "Center" },
  { x: 20, y: 50, label: "Left" },
  { x: 80, y: 50, label: "Right" },
  { x: 50, y: 30, label: "Top" },
  { x: 50, y: 70, label: "Bottom" },
];

export const GazeCalibration = ({ videoElement, onComplete, onSkip }: GazeCalibrationProps) => {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [measurements, setMeasurements] = useState<Array<{ horizontal: number; vertical: number }>>([]);
  const [countdown, setCountdown] = useState(3);
  const detectorRef = useRef<faceDetection.FaceDetector | null>(null);

  useEffect(() => {
    const initDetector = async () => {
      try {
        await tf.ready();
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
          runtime: "tfjs" as const,
          maxFaces: 1,
        };
        detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
      } catch (error) {
        console.error("Failed to initialize face detector:", error);
      }
    };

    initDetector();

    return () => {
      detectorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isCalibrating || countdown > 0) return;

    const measureGaze = async () => {
      if (!videoElement || !detectorRef.current) return;

      try {
        const faces = await detectorRef.current.estimateFaces(videoElement);
        if (faces.length === 1) {
          const face = faces[0];
          const keypoints = face.keypoints;

          const leftEye = keypoints?.find(kp => kp.name === "leftEye");
          const rightEye = keypoints?.find(kp => kp.name === "rightEye");
          const noseTip = keypoints?.find(kp => kp.name === "noseTip");

          if (leftEye && rightEye && noseTip) {
            const eyeCenterX = (leftEye.x + rightEye.x) / 2;
            const eyeCenterY = (leftEye.y + rightEye.y) / 2;

            const horizontalDeviation = Math.abs(eyeCenterX - noseTip.x);
            const verticalDeviation = Math.abs(eyeCenterY - noseTip.y);

            setMeasurements(prev => [...prev, { horizontal: horizontalDeviation, vertical: verticalDeviation }]);
            
            // Move to next point
            if (currentPointIndex < calibrationPoints.length - 1) {
              setCurrentPointIndex(prev => prev + 1);
              setIsCalibrating(false);
              setCountdown(3);
            } else {
              // Calibration complete
              completeCalibration([...measurements, { horizontal: horizontalDeviation, vertical: verticalDeviation }]);
            }
          }
        }
      } catch (error) {
        console.error("Gaze measurement error:", error);
      }
    };

    const timeout = setTimeout(measureGaze, 1000);
    return () => clearTimeout(timeout);
  }, [isCalibrating, countdown, currentPointIndex, videoElement, measurements]);

  useEffect(() => {
    if (isCalibrating && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isCalibrating, countdown]);

  const completeCalibration = (allMeasurements: Array<{ horizontal: number; vertical: number }>) => {
    // Calculate thresholds based on measurements
    const horizontalValues = allMeasurements.map(m => m.horizontal);
    const verticalValues = allMeasurements.map(m => m.vertical);

    // Use max deviation as threshold (with some buffer)
    const horizontalThreshold = Math.max(...horizontalValues) * 1.2;
    const verticalThreshold = Math.max(...verticalValues) * 1.2;

    onComplete({
      horizontalThreshold: Math.max(horizontalThreshold, 30), // minimum threshold
      verticalThreshold: Math.max(verticalThreshold, 25), // minimum threshold
    });
  };

  const startCalibration = () => {
    setIsCalibrating(true);
  };

  const currentPoint = calibrationPoints[currentPointIndex];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <Card className="p-8 max-w-2xl w-full mx-4">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Eye className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">Eye-Tracking Calibration</h2>
          </div>

          <p className="text-muted-foreground">
            We'll calibrate the eye-tracking system to your unique setup. This takes about 30 seconds.
          </p>

          <div className="relative h-64 bg-muted/30 rounded-lg border-2 border-dashed border-border overflow-hidden">
            <AnimatePresence mode="wait">
              {isCalibrating ? (
                <motion.div
                  key={`point-${currentPointIndex}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute"
                  style={{
                    left: `${currentPoint.x}%`,
                    top: `${currentPoint.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="relative">
                    <Target className="w-12 h-12 text-primary animate-pulse" />
                    {countdown > 0 && (
                      <motion.div
                        key={countdown}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="text-3xl font-bold text-primary">{countdown}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="text-center space-y-4">
                    <Eye className="w-16 h-16 text-muted-foreground mx-auto" />
                    <p className="text-lg font-medium">Ready to start calibration?</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isCalibrating && (
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">
                Look at the <span className="font-semibold text-foreground">{currentPoint.label}</span> target
              </p>
              <span className="text-sm text-muted-foreground">
                ({currentPointIndex + 1}/{calibrationPoints.length})
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            {!isCalibrating ? (
              <>
                <Button onClick={startCalibration} size="lg" className="flex-1">
                  <Target className="w-4 h-4 mr-2" />
                  Start Calibration
                </Button>
                <Button onClick={onSkip} variant="outline" size="lg" className="flex-1">
                  Skip (Use Default)
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 mx-auto text-sm text-muted-foreground">
                <div className="animate-pulse">●</div>
                Calibrating...
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {calibrationPoints.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index < currentPointIndex
                    ? "bg-primary"
                    : index === currentPointIndex && isCalibrating
                    ? "bg-primary animate-pulse"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
