import React from "react";
import { Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface ZoomEffect {
  from: number;
  to: number;
}

interface ClipSequenceProps {
  src: string;
  isPhoto: boolean;
  startFrom?: number;
  endAt?: number;
  zoomEffect?: ZoomEffect | null;
}

export const ClipSequence: React.FC<ClipSequenceProps> = ({
  src,
  isPhoto,
  startFrom = 0,
  endAt,
  zoomEffect,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const scale = zoomEffect
    ? interpolate(
        frame,
        [0, durationInFrames],
        [zoomEffect.from, zoomEffect.to],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${scale})`,
    transformOrigin: "center",
  };

  if (isPhoto) {
    return (
      <div style={containerStyle}>
        <Img src={src} style={mediaStyle} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Video
        src={src}
        style={mediaStyle}
        startFrom={Math.floor(startFrom * fps)}
        endAt={endAt !== undefined ? Math.floor(endAt * fps) : undefined}
      />
    </div>
  );
};
