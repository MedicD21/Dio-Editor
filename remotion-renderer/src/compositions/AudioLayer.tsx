import React from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface AudioLayerProps {
  src: string;
  volume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  totalDuration: number;
}

export const AudioLayer: React.FC<AudioLayerProps> = ({
  src,
  volume,
  fadeInDuration,
  fadeOutDuration,
  totalDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeInFrames = fadeInDuration * fps;
  const totalFrames = totalDuration * fps;
  const fadeOutStart = totalFrames - fadeOutDuration * fps;

  const computedVolume = interpolate(
    frame,
    [0, fadeInFrames, fadeOutStart, totalFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return <Audio src={src} volume={computedVolume} />;
};
