import React from "react";
import { Composition } from "remotion";
import { SocialVideo, type SocialVideoProps } from "./compositions/SocialVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialVideo"
        component={SocialVideo as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          clips: [],
          audio: null,
          totalDurationSeconds: 30,
        } as SocialVideoProps}
      />
    </>
  );
};
