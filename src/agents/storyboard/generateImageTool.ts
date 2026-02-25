import generateImagePromptsTool from "@/agents/storyboard/generateImagePromptsTool";
import u from "@/utils";
import sharp from "sharp";
import { z } from "zod";

interface AssetItem {
  name: string;
  description: string;
}

interface EpisodeData {
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: AssetItem[];
  characters: AssetItem[];
  props: AssetItem[];
  coreConflict: string;
  openingHook: string;
  outline: string;
  keyEvents: string[];
  emotionalCurve: string;
  visualHighlights: string[];
  endingHook: string;
  classicQuotes: string[];
}

interface ImageInfo {
  name: string;
  type: string;
  filePath: string;
}

interface ResourceItem {
  name: string;
  intro: string;
}

// 压缩图片直到不超过指定大小
async function compressImage(buffer: Buffer, maxSizeBytes: number = 3 * 1024 * 1024): Promise<Buffer> {
  if (buffer.length <= maxSizeBytes) {
    return buffer;
  }
  let quality = 90;
  let compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
  while (compressedBuffer.length > maxSizeBytes && quality > 10) {
    quality -= 10;
    compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
  }
  if (compressedBuffer.length > maxSizeBytes) {
    const metadata = await sharp(buffer).metadata();
    let scale = 0.9;
    while (compressedBuffer.length > maxSizeBytes && scale > 0.1) {
      const newWidth = Math.round((metadata.width || 1000) * scale);
      const newHeight = Math.round((metadata.height || 1000) * scale);
      compressedBuffer = await sharp(buffer)
        .resize(newWidth, newHeight, { fit: "inside" })
        .jpeg({ quality: Math.max(quality, 30) })
        .toBuffer();
      scale -= 0.1;
    }
  }
  return compressedBuffer;
}

// 拼接多张图片为一张
async function mergeImages(imagePaths: string[]): Promise<Buffer> {
  const imageBuffers = await Promise.all(imagePaths.map((path) => u.oss.getFile(path)));
  const imageMetadatas = await Promise.all(imageBuffers.map((buffer) => sharp(buffer).metadata()));
  const maxHeight = Math.max(...imageMetadatas.map((m) => m.height || 0));
  const resizedImages = await Promise.all(
    imageBuffers.map(async (buffer, index) => {
      const metadata = imageMetadatas[index];
      const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
      const newWidth = Math.round(maxHeight * aspectRatio);
      return {
        buffer: await sharp(buffer).resize(newWidth, maxHeight, { fit: "cover" }).toBuffer(),
        width: newWidth,
      };
    }),
  );
  let currentX = 0;
  const compositeInputs = resizedImages.map(({ buffer, width }) => {
    const input = {
      input: buffer,
      left: currentX,
      top: 0,
    };
    currentX += width;
    return input;
  });
  const mergedImage = await sharp({
    create: {
      width: currentX,
      height: maxHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality: 90 })
    .toBuffer();
  return compressImage(mergedImage);
}

// 进一步压缩单张图片到指定大小
async function compressToSize(buffer: Buffer, targetSize: number): Promise<Buffer> {
  if (buffer.length <= targetSize) {
    return buffer;
  }

  const metadata = await sharp(buffer).metadata();
  let quality = 80;
  let scale = 1.0;
  let compressedBuffer = buffer;

  // 先尝试降低质量
  while (compressedBuffer.length > targetSize && quality > 10) {
    compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
    quality -= 10;
  }

  // 如果还是太大，缩小尺寸
  while (compressedBuffer.length > targetSize && scale > 0.2) {
    scale -= 0.1;
    const newWidth = Math.round((metadata.width || 1000) * scale);
    const newHeight = Math.round((metadata.height || 1000) * scale);
    compressedBuffer = await sharp(buffer)
      .resize(newWidth, newHeight, { fit: "inside" })
      .jpeg({ quality: Math.max(quality, 20) })
      .toBuffer();
  }

  return compressedBuffer;
}

// 确保图片列表总大小不超过指定限制
async function ensureTotalSizeLimit(buffers: Buffer[], maxTotalBytes: number = 10 * 1024 * 1024): Promise<Buffer[]> {
  let totalSize = buffers.reduce((sum, buf) => sum + buf.length, 0);

  if (totalSize <= maxTotalBytes) {
    return buffers;
  }

  // 计算每张图片的平均目标大小
  const avgTargetSize = Math.floor(maxTotalBytes / buffers.length);

  // 按大小降序排列，优先压缩大图片
  const indexedBuffers = buffers.map((buf, idx) => ({ buf, idx, size: buf.length }));
  indexedBuffers.sort((a, b) => b.size - a.size);

  const result = [...buffers];

  for (const item of indexedBuffers) {
    totalSize = result.reduce((sum, buf) => sum + buf.length, 0);
    if (totalSize <= maxTotalBytes) {
      break;
    }

    // 计算这张图片需要压缩到的目标大小
    const excessSize = totalSize - maxTotalBytes;
    const targetSize = Math.max(item.buf.length - excessSize, avgTargetSize, 100 * 1024); // 最小100KB

    if (item.buf.length > targetSize) {
      result[item.idx] = await compressToSize(item.buf, targetSize);
    }
  }

  return result;
}

// 处理图片列表，确保不超过10张且每张不超过3MB，总大小不超过10MB
async function processImages(images: ImageInfo[]): Promise<Buffer[]> {
  const maxImages = 10;
  let processedBuffers: Buffer[];

  if (images.length <= maxImages) {
    const buffers = await Promise.all(images.map((img) => u.oss.getFile(img.filePath)));
    processedBuffers = await Promise.all(buffers.map((buffer) => compressImage(buffer)));
  } else {
    const mergeStartIndex = maxImages - 1;
    const firstBuffers = await Promise.all(images.slice(0, mergeStartIndex).map((img) => u.oss.getFile(img.filePath)));
    const compressedFirstImages = await Promise.all(firstBuffers.map((buffer) => compressImage(buffer)));
    const imagesToMergeList = images.slice(mergeStartIndex).map((img) => img.filePath);
    const mergedImage = await mergeImages(imagesToMergeList);
    processedBuffers = [...compressedFirstImages, mergedImage];
  }

  // 确保总大小不超过10MB
  return ensureTotalSizeLimit(processedBuffers);
}

// 使用 AI 过滤与分镜相关的资产
async function filterRelevantAssets(prompts: string[], allResources: ResourceItem[], availableImages: ImageInfo[]): Promise<ImageInfo[]> {
  if (allResources.length === 0 || availableImages.length === 0) {
    return availableImages;
  }

  const availableNames = new Set(availableImages.map((img) => img.name));
  const availableResources = allResources.filter((r) => availableNames.has(r.name));

  if (availableResources.length === 0) {
    return availableImages;
  }

  const apiConfig = await u.getPromptAi("storyboardAgent");
  const { relevantAssets } = await u.ai.text.invoke(
    {
      messages: [
        {
          role: "user",
          content: `请分析以下分镜描述，从可用资产中筛选出与分镜内容直接相关的资产。

分镜描述：
${prompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

可用资产列表：
${availableResources.map((r) => `- ${r.name}：${r.intro}`).join("\n")}

请仅选择在分镜中明确出现或被提及的角色、场景、道具。不要选择与分镜内容无关的资产。`,
        },
      ],
      output: {
        relevantAssets: z
          .array(
            z.object({
              name: z.string().describe("资产名称"),
              reason: z.string().describe("选择该资产的原因"),
            }),
          )
          .describe("与分镜内容相关的资产列表"),
      },
    },
    apiConfig,
  );

  if (!relevantAssets || relevantAssets.length === 0) {
    return availableImages;
  }

  const relevantNames = new Set(relevantAssets.map((a) => a.name));
  const filteredImages = availableImages.filter((img) => relevantNames.has(img.name));

  return filteredImages.length > 0 ? filteredImages : availableImages;
}

// 构建资产映射提示词
function buildResourcesMapPrompts(images: ImageInfo[]): string {
  if (images.length === 0) return "";

  const mapping = images.map((item, index) => {
    if (index < 9) {
      return `${item.name}=图片${index + 1}`;
    } else {
      return `${item.name}=图10-${index - 8}`;
    }
  });

  return `其中人物、场景、道具参考对照关系如下：${mapping.join(", ")}。`;
}

/** 视觉风格枚举：与前端选择一致 */
export const VISUAL_STYLE_VALUES = ["realistic", "anime", "other"] as const;
export type VisualStyleType = (typeof VISUAL_STYLE_VALUES)[number];

/** 根据项目 visualStyle 或 type + artStyle 推断视觉类型 */
function resolveVisualStyleType(
  visualStyle?: string | null,
  projectType?: string | null,
  artStyle?: string | null
): "anime" | "realistic" | "unified" {
  const v = (visualStyle ?? "").toLowerCase();
  if (v === "realistic") return "realistic";
  if (v === "anime") return "anime";
  if (v === "other") return "unified";

  const typeStr = (projectType ?? "").toLowerCase();
  const styleStr = (artStyle ?? "").toLowerCase();
  const combined = `${typeStr} ${styleStr}`;
  if (/动漫|二次元|日系|2d|动画|anime|cartoon|卡通|手绘|插画|国漫|番剧/.test(combined)) return "anime";
  if (/写实|真人|电影|实拍|photorealistic|cinematic|真实|realistic|实景/.test(combined)) return "realistic";
  return "unified";
}

/** 构建分镜图生成的完整 systemPrompt：角色一致性 + 风格统一 + 资产映射 */
function buildStoryboardSystemPrompt(
  resourcesMapPrompts: string,
  filteredImages: ImageInfo[],
  visualStyle?: string | null,
  projectType?: string | null,
  artStyle?: string | null
): string {
  const visualType = resolveVisualStyleType(visualStyle, projectType, artStyle);
  const roleNames = filteredImages.filter((img) => img.type === "角色").map((img) => img.name);

  const parts: string[] = [];

  // 1. 角色一致性（强制）：有角色资产时必须严格按参考图绘制
  if (roleNames.length > 0) {
    parts.push(
      `【角色一致性 - 强制】本分镜已提供角色参考图，以下角色必须严格按照其对应参考图绘制，禁止自行发挥或同一角色出现不同长相、发型、服装：${roleNames.join("、")}。每个格内出现的上述角色，其五官、发型、发色、体型、服装必须与参考图一致。`
    );
  }

  // 2. 风格统一：禁止动漫与写实混用
  if (visualType === "anime") {
    parts.push(
      "【风格统一 - 强制】本项目为动漫/二次元风格。所有格内人物必须统一为动漫风格绘制，禁止出现写实、真人、照片感人物，整张分镜图风格一致。"
    );
  } else if (visualType === "realistic") {
    parts.push(
      "【风格统一 - 强制】本项目为写实/真人风格。所有格内人物必须统一为写实风格绘制，禁止出现动漫、卡通、二次元风格人物，整张分镜图风格一致。"
    );
  } else {
    parts.push(
      `【风格统一 - 强制】本项目风格：${artStyle || projectType || "统一"}。所有格必须保持同一视觉风格，禁止在同一张分镜图中混用动漫人物与写实人物。`
    );
  }

  // 3. 资产参考对照
  parts.push(resourcesMapPrompts);

  return parts.join("\n\n");
}

export default async (cells: { prompt: string }[], scriptId: number, projectId: number) => {
  const scriptData = await u.db("t_script").where({ id: scriptId, projectId }).first();
  const projectInfo = await u.db("t_project").where({ id: projectId }).first();

  const row = await u.db("t_outline").where({ id: scriptData?.outlineId!, projectId }).first();
  const outline: EpisodeData | null = row?.data ? JSON.parse(row.data) : null;

  const resources: ResourceItem[] = outline
    ? (["characters", "props", "scenes"] as const).flatMap((k) => outline[k]?.map((i) => ({ name: i.name, intro: i.description })) ?? [])
    : [];

  const resourceNames = resources.map((r) => r.name);
  const imagesRaw = await u.db("t_assets").whereIn("name", resourceNames).andWhere({ projectId }).select("name", "type", "filePath");

  const allImages = imagesRaw
    .sort((a, b) => {
      const order = ["角色", "场景", "道具"];
      return order.indexOf(a.type!) - order.indexOf(b.type!);
    })
    .filter((img) => img.filePath) as ImageInfo[];

  if (allImages.length === 0) {
    throw new Error("未找到可用的图片资源");
  }

  const cellPrompts = cells.map((c) => c.prompt);

  // 使用 AI 过滤相关资产
  const filteredImages = await filterRelevantAssets(cellPrompts, resources, allImages);

  const resourcesMapPrompts = buildResourcesMapPrompts(filteredImages);
  const systemPrompt = buildStoryboardSystemPrompt(
    resourcesMapPrompts,
    filteredImages,
    projectInfo?.visualStyle ?? null,
    projectInfo?.type ?? null,
    projectInfo?.artStyle ?? null
  );
  console.log("====润色前：", cellPrompts);
  const styleLabel =
    projectInfo?.visualStyle === "realistic"
      ? "现实"
      : projectInfo?.visualStyle === "anime"
        ? "漫剧"
        : projectInfo?.visualStyle === "other"
          ? "其他（统一风格）"
          : "";
  const styleStr = styleLabel
    ? `视觉类型：${styleLabel}，类型：${projectInfo?.type ?? ""}，风格：${projectInfo?.artStyle ?? ""}`
    : `类型：${projectInfo?.type!}，风格：${projectInfo?.artStyle!}`;
  const promptsData = await generateImagePromptsTool({
    prompts: cellPrompts,
    style: styleStr,
    aspectRatio: projectInfo?.videoRatio! as any,
    assetsName: resources,
  });

  //   const prompts = `请生成${promptsData.gridLayout.totalCells}格,${promptsData.gridLayout.cols}列×${promptsData.gridLayout.rows}行宫格图。

  // ${promptsData.prompt}

  // 注意：请严格按照提示词内容生成图片，确保人物样貌、艺术风格、色调光影一致。
  // `;
  const prompts = promptsData.prompt;
  console.log("====润色后：", prompts);

  const processedImages = await processImages(filteredImages);
  const apiConfig = await u.getPromptAi("storyboardImage");

  const contentStr = await u.ai.image(
    {
      systemPrompt,
      prompt: prompts,
      size: "4K",
      aspectRatio: projectInfo?.videoRatio ? (projectInfo.videoRatio as any) : "16:9",
      imageBase64: processedImages.map((buf) => buf.toString("base64")),
    },
    apiConfig,
  );

  const match = contentStr.match(/base64,([A-Za-z0-9+/=]+)/);
  const base64Str = match?.[1] ?? contentStr;
  const buffer = Buffer.from(base64Str, "base64");

  return buffer;
};
