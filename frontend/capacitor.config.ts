import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dioeditor.app",
  appName: "Dio Editor",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#080808",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#080808",
    },
  },
};

export default config;
