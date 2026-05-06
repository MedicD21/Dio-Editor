import React from "react";
import { Composition } from "remotion";
import { SocialVideo } from "./compositions/SocialVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialVideo"
        component={SocialVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          clips: [],
          audio: null,
          totalDurationSeconds: 30,
        }}
      />
    </>
  );
};
