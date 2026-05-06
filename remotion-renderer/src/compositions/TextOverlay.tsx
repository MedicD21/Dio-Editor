import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface TextOverlayProps {
  text: string;
  position: "top" | "center" | "bottom";
  style: "title" | "caption" | "label";
  appearAt: number;
  duration: number;
}

const positionStyles: Record<string, React.CSSProperties> = {
  top: { top: "8%", left: 0, right: 0, alignItems: "center" },
  center: { top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  bottom: { bottom: "8%", left: 0, right: 0, alignItems: "center" },
};

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  position,
  style,
  appearAt,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relativeFrame = frame - appearAt * fps;
  const fadeOutStart = (duration - 0.3) * fps;

  if (relativeFrame < 0 || relativeFrame > duration * fps) {
    return null;
  }

  const opacity = interpolate(
    relativeFrame,
    [0, 8, fadeOutStart, duration * fps],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 18, stiffness: 200, mass: 0.5 },
    from: style === "title" ? 30 : 15,
    to: 0,
  });

  const posStyle = positionStyles[position] || positionStyles.bottom;

  if (style === "title") {
    return (
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          ...posStyle,
          opacity,
          transform: `translateY(${translateY}px)`,
          padding: "0 48px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: 96,
            color: "#FFFFFF",
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            lineHeight: 1.1,
            letterSpacing: "0.02em",
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  if (style === "caption") {
    return (
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          ...posStyle,
          opacity,
          transform: `translateY(${translateY}px)`,
          padding: "0 32px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
            fontSize: 36,
            color: "#FFFFFF",
            textAlign: "center",
            background: "rgba(0,0,0,0.55)",
            padding: "12px 24px",
            borderRadius: 32,
            lineHeight: 1.4,
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "5%",
        right: "5%",
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 10,
      }}
    >
      <span
        style={{
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          fontSize: 24,
          color: "rgba(255,255,255,0.85)",
          background: "rgba(0,0,0,0.35)",
          padding: "6px 14px",
          borderRadius: 6,
        }}
      >
        {text}
      </span>
    </div>
  );
};
