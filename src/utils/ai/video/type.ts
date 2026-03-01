interface VideoConfig {
  duration: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  resolution: "480p" | "720p" | "1080p" | "2K" | "4K";
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  savePath: string;
  imageBase64?: string[];
  audio?: boolean;
  /** 分镜人物对话（格式如「角色名：台词」），供支持按角色音色的厂商使用 */
  dialogue?: string;
  mode: "startEnd" | "multi" | "single" | "text";
}

interface AIConfig {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  manufacturer?: string;
}
