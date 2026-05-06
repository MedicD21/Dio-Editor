import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type TransitionType =
  | "cut"
  | "crossfade"
  | "zoom_in"
  | "zoom_out"
  | "slide_left"
  | "slide_right"
  | "none";

interface TransitionProps {
  type: TransitionType;
  durationInFrames: number;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationInFrames,
  outgoing,
  incoming,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const progress = durationInFrames > 0 ? frame / durationInFrames : 1;

  if (type === "cut" || type === "none" || durationInFrames <= 0) {
    return <>{progress < 0.5 ? outgoing : incoming}</>;
  }

  if (type === "crossfade") {
    const outOpacity = interpolate(progress, [0, 1], [1, 0]);
    const inOpacity = interpolate(progress, [0, 1], [0, 1]);
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", inset: 0, opacity: outOpacity }}>
          {outgoing}
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: inOpacity }}>
          {incoming}
        </div>
      </div>
    );
  }

  if (type === "zoom_in") {
    const scale = interpolate(progress, [0, 1], [1.0, 1.15]);
    const inOpacity = interpolate(progress, [0, 0.4, 1], [0, 0.6, 1]);
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {outgoing}
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: inOpacity }}>
          {incoming}
        </div>
      </div>
    );
  }

  if (type === "zoom_out") {
    const scale = interpolate(progress, [0, 1], [1.15, 1.0]);
    const inOpacity = interpolate(progress, [0, 0.5, 1], [0, 0.5, 1]);
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {outgoing}
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: inOpacity }}>
          {incoming}
        </div>
      </div>
    );
  }

  if (type === "slide_left") {
    const outX = interpolate(progress, [0, 1], [0, -width]);
    const inX = interpolate(progress, [0, 1], [width, 0]);
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${outX}px)` }}>
          {outgoing}
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${inX}px)` }}>
          {incoming}
        </div>
      </div>
    );
  }

  if (type === "slide_right") {
    const outX = interpolate(progress, [0, 1], [0, width]);
    const inX = interpolate(progress, [0, 1], [-width, 0]);
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${outX}px)` }}>
          {outgoing}
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${inX}px)` }}>
          {incoming}
        </div>
      </div>
    );
  }

  return <>{incoming}</>;
};
