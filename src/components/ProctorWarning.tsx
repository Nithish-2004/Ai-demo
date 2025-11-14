import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface ProctorWarningProps {
  isVisible: boolean;
  message: string;
  severity: "warning" | "critical";
  countdown?: number;
  onDismiss?: () => void;
  violationCount?: number;
  violationType?: string;
}

export const ProctorWarning = ({ 
  isVisible, 
  message, 
  severity, 
  countdown,
  onDismiss,
  violationCount,
  violationType
}: ProctorWarningProps) => {
  const getViolationTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      tab_switch: "Tab Switch",
      fullscreen_exit: "Full-Screen Exit",
      multiple_faces: "Multiple Faces",
      background_noise: "Background Noise",
      screen_share_ended: "Screen Share Stopped"
    };
    return type ? labels[type] || type : "Unknown";
  };
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              boxShadow: severity === "critical" 
                ? "0 0 50px rgba(239, 68, 68, 0.5)"
                : "0 0 30px rgba(234, 179, 8, 0.5)"
            }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-card border-2 ${
              severity === "critical" ? "border-red-500" : "border-yellow-500"
            } rounded-lg p-8 max-w-md w-full relative`}
          >
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
              }}
              transition={{ 
                duration: 0.5,
                repeat: severity === "critical" ? Infinity : 0,
                repeatDelay: 1
              }}
              className="flex justify-center mb-4"
            >
              <AlertTriangle 
                className={`h-16 w-16 ${
                  severity === "critical" ? "text-red-500" : "text-yellow-500"
                }`} 
              />
            </motion.div>

            <h2 className={`text-2xl font-bold text-center mb-4 ${
              severity === "critical" ? "text-red-500" : "text-yellow-500"
            }`}>
              {severity === "critical" ? "Violation Limit Exceeded" : "Violation Detected"}
            </h2>

            {violationType && (
              <div className="text-center mb-3">
                <span className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium">
                  {getViolationTypeLabel(violationType)}
                </span>
              </div>
            )}

            <p className="text-center text-muted-foreground mb-4">
              {message}
            </p>

            {violationCount !== undefined && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-4 rounded-lg border-2 mb-4 ${
                  severity === "critical" 
                    ? "bg-red-500/10 border-red-500/30" 
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-1 ${
                    severity === "critical" ? "text-red-500" : "text-yellow-500"
                  }`}>
                    Violation #{violationCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {severity === "critical" 
                      ? "Limit exceeded - Interview terminating" 
                      : "Return to proper behavior immediately"}
                  </p>
                </div>
              </motion.div>
            )}

            {countdown !== undefined && countdown > 0 && (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary mb-2">
                  {countdown}
                </div>
                <p className="text-sm text-muted-foreground">
                  seconds remaining
                </p>
              </motion.div>
            )}

            {severity === "critical" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <p className="text-sm text-center text-red-400">
                  This interview will be automatically terminated and marked with integrity concerns.
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
