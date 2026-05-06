import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { ClipSequence } from "./ClipSequence";
import { TextOverlay } from "./TextOverlay";
import { AudioLayer } from "./AudioLayer";

interface TextOverlayDef {
  text: string;
  position: "top" | "center" | "bottom";
  style: "title" | "caption" | "label";
  appear_at: number;
  duration: number;
}

interface ZoomEffect {
  from: number;
  to: number;
}

interface ClipDef {
  asset_id: string;
  asset_path: string;
  is_photo: boolean;
  clip_start: number;
  clip_end: number;
  screen_duration: number;
  transition_in: string;
  transition_duration: number;
  text_overlay: TextOverlayDef | null;
  zoom_effect: ZoomEffect | null;
}

interface AudioDef {
  src: string;
  mood: string;
  bpm_preference: number;
  fade_in_duration: number;
  fade_out_duration: number;
  volume: number;
}

interface SocialVideoProps {
  clips: ClipDef[];
  audio: AudioDef | null;
  totalDurationSeconds: number;
}

export const SocialVideo: React.FC<SocialVideoProps> = ({
  clips,
  audio,
  totalDurationSeconds,
}) => {
  const { fps } = useVideoConfig();
  let currentFrame = 0;

  return (
    <div style={{ width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
      {clips.map((clip, index) => {
        const durationFrames = Math.round(clip.screen_duration * fps);
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        return (
          <Sequence key={clip.asset_id + index} from={startFrame} durationInFrames={durationFrames}>
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
              <ClipSequence
                src={clip.asset_path}
                isPhoto={clip.is_photo}
                startFrom={clip.clip_start}
                endAt={clip.is_photo ? undefined : clip.clip_end}
                zoomEffect={clip.zoom_effect}
              />
              {clip.text_overlay && (
                <TextOverlay
                  text={clip.text_overlay.text}
                  position={clip.text_overlay.position}
                  style={clip.text_overlay.style}
                  appearAt={clip.text_overlay.appear_at}
                  duration={clip.text_overlay.duration}
                />
              )}
            </div>
          </Sequence>
        );
      })}

      {audio && (
        <Sequence from={0} durationInFrames={Math.round(totalDurationSeconds * fps)}>
          <AudioLayer
            src={audio.src}
            volume={audio.volume}
            fadeInDuration={audio.fade_in_duration}
            fadeOutDuration={audio.fade_out_duration}
            totalDuration={totalDurationSeconds}
          />
        </Sequence>
      )}
    </div>
  );
};
