import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Mic, Shield, CheckCircle2, Monitor } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Card } from "./ui/card";

interface ProctorConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const ProctorConsent = ({ onAccept, onDecline }: ProctorConsentProps) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToMonitoring, setAgreedToMonitoring] = useState(false);

  const canProceed = agreedToTerms && agreedToMonitoring;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl my-8"
      >
        <Card className="p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-16 w-16 text-primary" />
          </div>

          <h2 className="text-3xl font-bold text-center mb-4">
            Interview Integrity Agreement
          </h2>

          <p className="text-center text-muted-foreground mb-8">
            To ensure a fair and authentic interview experience, we use AI-powered proctoring.
          </p>

          <div className="space-y-6 mb-8">
            <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
              <Camera className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Camera Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Your camera will detect and verify that only you are present during the interview. 
                  Multiple faces or unauthorized persons will trigger automatic termination.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
              <Mic className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Audio Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Background audio will be analyzed to detect unauthorized voices or assistance. 
                  Detection of other persons speaking will result in session termination.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
              <Monitor className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Screen Sharing Required</h3>
                <p className="text-sm text-muted-foreground">
                  You must share your entire screen throughout the interview. Stopping screen sharing 
                  will immediately terminate the session.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-primary/5 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Full-Screen & Tab Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  You must remain in full-screen mode. Exiting full-screen or switching tabs/windows 
                  will immediately terminate the interview.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8 p-4 bg-accent/5 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Privacy & Data Usage</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• You will be monitored throughout this interview with a violation tolerance system</li>
              <li>• The system allows up to 5 violations total across all monitoring types</li>
              <li>• Severe violations (e.g., multiple faces) may count as 2 violations</li>
              <li>• Exceeding 5 violations will result in automatic termination and malpractice flag</li>
              <li>• Audio, video, and screen data is processed in real-time for integrity monitoring</li>
              <li>• Evidence of violations may be stored and included in your report</li>
              <li>• All camera, microphone, and screen sharing access is released after the interview</li>
              <li>• All data is encrypted and handled per our privacy policy</li>
              <li>• No data is shared with third parties without your consent</li>
            </ul>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                I understand and agree to the proctoring requirements and will ensure I'm in a 
                quiet environment with no other persons present.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="monitoring" 
                checked={agreedToMonitoring}
                onCheckedChange={(checked) => setAgreedToMonitoring(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="monitoring" className="text-sm cursor-pointer">
                I consent to camera, microphone, screen sharing, and full-screen monitoring during 
                this interview session and understand that violations will result in immediate termination 
                with all devices being released.
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1"
            >
              Decline & Exit
            </Button>
            <Button
              onClick={onAccept}
              disabled={!canProceed}
              className="flex-1"
            >
              Accept & Continue
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
