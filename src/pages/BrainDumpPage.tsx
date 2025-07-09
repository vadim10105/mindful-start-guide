import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Brain, ArrowRight, Image as ImageIcon, Mic, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedTask {
  title: string;
  estimated_urgency: 'low' | 'medium' | 'high';
  estimated_effort: 'quick' | 'medium' | 'long';
}

const BrainDumpPage = () => {
  const [brainDumpText, setBrainDumpText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          toast({
            title: "Camera Access Error",
            description: "Could not access your camera. Please ensure permissions are granted.",
            variant: "destructive",
          });
          setShowCamera(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
  }, [showCamera, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `brain-dump-${Date.now()}.png`, { type: 'image/png' });
            setSelectedImage(capturedFile);
            setShowCamera(false);
          }
        }, 'image/png');
      }
    }
  };

  const handleBrainDumpSubmit = async () => {
    if (!brainDumpText.trim() && !selectedImage) {
      return;
    }

    setIsProcessing(true);
    let textToProcess = brainDumpText;

    try {
      if (selectedImage) {
        const fileExtension = selectedImage.name.split('.').pop();
        const filePath = `public/${Date.now()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('brain-dumps-images')
          .upload(filePath, selectedImage, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('brain-dumps-images')
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('Failed to get public URL for image');
        }

        // Call new Supabase function for image processing
        const { data: imageData, error: imageError } = await supabase.functions.invoke('process-image-brain-dump', {
          body: { imageUrl: publicUrlData.publicUrl }
        });

        if (imageError) {
          throw new Error(`Failed to process image brain dump: ${imageError.message}`);
        }

        if (!imageData?.extractedText) {
          throw new Error('No text extracted from image');
        }
        textToProcess = `${textToProcess}\n\n${imageData.extractedText}`;
      }

      const { data, error } = await supabase.functions.invoke('process-brain-dump', {
        body: { brainDumpText: textToProcess }
      });

      if (error) {
        throw new Error('Failed to process brain dump');
      }

      if (!data?.tasks) {
        throw new Error('No tasks extracted from brain dump');
      }

      localStorage.setItem('extractedTasks', JSON.stringify(data.tasks));
      navigate('/tagging');
      
      toast({
        title: "Brain dump processed!",
        description: `Extracted ${data.tasks.length} tasks`,
      });

    } catch (error: unknown) {
      const err = error as Error;
      let errorMessage = "Failed to process brain dump. Please try again.";
      
      if (err.message.includes("quota") || err.message.includes("billing")) {
        errorMessage = "OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com/usage.";
      } else {
        errorMessage = err.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedImage(null); // Clear selected image after processing
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Task Creation</h1>
          <p className="text-muted-foreground">
            Transform your thoughts into organized, prioritized tasks
          </p>
        </div>

        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Brain Dump Space
            </CardTitle>
            <p className="text-muted-foreground">
              Just dump everything on your mind here - AI will organize it into tasks
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Let it all out... thoughts, tasks, ideas, anything!\n\nFor example:\nNeed to call mom about dinner this weekend, also grocery shopping for the party, fix that leaky faucet that's been bugging me, send the quarterly report to Sarah by Friday, maybe clean the garage this weekend if I have time..."
              value={brainDumpText}
              onChange={(e) => setBrainDumpText(e.target.value)}
              className="min-h-[250px] resize-none text-base leading-relaxed border-none bg-muted/50 focus:bg-background transition-colors"
              rows={12}
            />
            {selectedImage && (
              <div className="mt-4 relative">
                <img src={URL.createObjectURL(selectedImage)} alt="Selected Brain Dump" className="max-w-full h-auto rounded-lg shadow-md" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                className="hidden"
              />
              <label htmlFor="image-upload" className="flex-shrink-0 p-2 rounded-full bg-muted/50 hover:bg-muted cursor-pointer">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </label>
              <label onClick={() => setShowCamera(true)} className="flex-shrink-0 p-2 rounded-full bg-muted/50 hover:bg-muted cursor-pointer">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </label>
              <Button 
                onClick={handleBrainDumpSubmit}
                disabled={(!brainDumpText.trim() && !selectedImage) || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-pulse" />
                    AI is organizing your thoughts...
                  </>
                ) : (
                  <>
                    Make a List
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg shadow-lg max-w-2xl w-full relative">
            <h2 className="text-xl font-bold mb-4">Take Photo</h2>
            <video id="camera-feed" ref={videoRef} className="w-full h-auto rounded-md bg-black" autoPlay playsInline></video>
            <canvas id="camera-canvas" ref={canvasRef} className="hidden"></canvas>
            <div className="flex justify-center gap-4 mt-4">
              <Button onClick={() => setShowCamera(false)} variant="outline">Cancel</Button>
              <Button onClick={handleCapture}>Capture</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrainDumpPage;