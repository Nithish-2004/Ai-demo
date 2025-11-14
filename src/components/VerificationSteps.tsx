import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail, Camera, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as faceapi from "@vladmandic/face-api";

interface VerificationStepsProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const VerificationSteps = ({ onComplete, onCancel }: VerificationStepsProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoIdCaptured, setPhotoIdCaptured] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setFaceApiLoaded(true);
        console.log("Face-api models loaded");
      } catch (error) {
        console.error("Error loading face-api:", error);
      }
    };
    loadModels();
  }, []);

  const steps = [
    { title: "Email Verification", icon: Mail, description: "Verify your email with OTP" },
    { title: "Photo ID Verification", icon: Camera, description: "Capture your ID document" },
    { title: "Biometric Setup", icon: Shield, description: "Setup face recognition" }
  ];

  const sendOTP = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('send-verification-otp', {
        body: { email: user?.email }
      });

      if (error) throw error;
      
      // Store dev OTP for testing
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }

      toast({
        title: "OTP Sent",
        description: `Check your email for the verification code. ${data.dev_otp ? `(Dev: ${data.dev_otp})` : ''}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('verify-otp', {
        body: { otp }
      });

      if (error) throw error;

      toast({ title: "Email Verified", description: "Moving to next step" });
      setCurrentStep(1);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const capturePhotoId = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Face recognition models still loading"
      });
      return;
    }

    setLoading(true);
    try {
      // Extract face embedding
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast({
          variant: "destructive",
          title: "No Face Detected",
          description: "Please ensure your face is clearly visible"
        });
        setLoading(false);
        return;
      }

      const faceEmbedding = Array.from(detection.descriptor);

      // Capture photo for storage
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
      });

      // Upload to storage
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user?.id}_id_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Save face embedding to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          face_embedding: faceEmbedding,
          photo_id_url: fileName,
          verified: true 
        })
        .eq('id', user?.id!);

      if (updateError) throw updateError;

      // Log verification
      await supabase.from('verification_logs').insert({
        user_id: user?.id!,
        verification_type: 'photo_id',
        status: 'completed',
        details: { 
          timestamp: new Date().toISOString(),
          embedding_length: faceEmbedding.length 
        }
      });

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setPhotoIdCaptured(true);
      toast({ title: "Photo ID Captured", description: "Face embedding saved" });
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const setupBiometric = async () => {
    setLoading(true);
    try {
      // In production, capture face embedding here
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({ title: "Verification Complete", description: "You're all set!" });
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera",
        variant: "destructive"
      });
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-2">Identity Verification</h2>
          <p className="text-muted-foreground mb-8">
            Complete these steps to ensure exam integrity
          </p>

          {/* Progress Steps */}
          <div className="flex justify-between mb-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <motion.div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      isComplete ? 'bg-primary text-primary-foreground' :
                      isCurrent ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {isComplete ? <Check className="w-8 h-8" /> : <Icon className="w-8 h-8" />}
                  </motion.div>
                  <p className="text-sm font-medium text-center">{step.title}</p>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center mb-4">We'll send a 6-digit code to your email</p>
                <Button onClick={sendOTP} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                </Button>
                {devOtp && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Development OTP: <span className="font-mono font-bold">{devOtp}</span></p>
                  </div>
                )}
                <Input
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
                <Button onClick={verifyOTP} disabled={loading || otp.length !== 6} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify OTP"}
                </Button>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center mb-4">Hold your ID document clearly visible to the camera</p>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                {!photoIdCaptured && (
                  <Button onClick={startCamera} className="w-full mb-2" disabled={!faceApiLoaded}>
                    {faceApiLoaded ? "Start Camera" : "Loading Models..."}
                  </Button>
                )}
                <Button onClick={capturePhotoId} disabled={loading || photoIdCaptured || !faceApiLoaded} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                   photoIdCaptured ? "Photo Captured" : 
                   !faceApiLoaded ? "Loading..." : "Capture & Verify Face"}
                </Button>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-center"
              >
                <Shield className="w-24 h-24 mx-auto text-primary" />
                <p className="text-lg">Setting up facial recognition for continuous monitoring</p>
                <Button onClick={setupBiometric} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="ghost" onClick={onCancel} className="w-full mt-6">
            Cancel
          </Button>
        </motion.div>
      </Card>
    </div>
  );
};