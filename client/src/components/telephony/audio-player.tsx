import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  SkipBack, 
  SkipForward 
} from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  onClose?: () => void;
}

export function AudioPlayer({ audioUrl, fileName, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    const newVolume = value[0];
    
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (audio) {
      audio.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        <div className="space-y-4">
          {/* File name */}
          <div className="text-sm font-medium text-center truncate" title={fileName}>
            {fileName}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
              data-testid="audio-progress-slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipBackward}
              data-testid="button-skip-back"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={togglePlay}
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={skipForward}
              data-testid="button-skip-forward"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume and actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              data-testid="button-mute"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="flex-1"
              data-testid="volume-slider"
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              data-testid="button-download-audio"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Close button if provided */}
          {onClose && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="w-full"
                data-testid="button-close-player"
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}