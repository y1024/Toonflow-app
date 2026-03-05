// @db-hash 175d9f3b78c74a95ceef6c26cdfda844
//该文件由脚本自动生成，请勿手动修改

export interface o_agentDeploy {
  'id'?: number;
  'name'?: string | null;
  'startTime'?: number | null;
}
export interface o_artStyle {
  'id'?: number;
  'name'?: string | null;
  'styles'?: string | null;
}
export interface o_assets {
  'id'?: number;
  'name'?: string | null;
  'startTime'?: number | null;
}
export interface o_event {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_eventChapter {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_model {
  'id'?: number;
  'name'?: string | null;
  'startTime'?: number | null;
}
export interface o_myTasks {
  'describe'?: string | null;
  'id'?: number;
  'model'?: string | null;
  'projectId'?: number | null;
  'reason'?: string | null;
  'relatedObjects'?: string | null;
  'startTime'?: number | null;
  'state'?: string | null;
  'taskClass'?: string | null;
}
export interface o_novel {
  'chapter'?: string | null;
  'chapterData'?: string | null;
  'chapterIndex'?: number | null;
  'createTime'?: number | null;
  'id'?: number;
  'projectId'?: number | null;
  'reel'?: string | null;
}
export interface o_outline {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_outlineNovel {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_project {
  'artStyle'?: string | null;
  'createTime'?: number | null;
  'id'?: number | null;
  'intro'?: string | null;
  'name'?: string | null;
  'projectType'?: string | null;
  'type'?: string | null;
  'userId'?: number | null;
  'videoRatio'?: string | null;
}
export interface o_prompt {
  'id'?: number;
  'name'?: string | null;
  'startTime'?: number | null;
}
export interface o_script {
  'content'?: string | null;
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
  'projectId'?: number | null;
}
export interface o_scriptAssets {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_scriptOutline {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_setting {
  'id'?: number;
  'imageModel'?: string | null;
  'languageModel'?: string | null;
  'projectId'?: number | null;
  'tokenKey'?: string | null;
  'userId'?: number | null;
}
export interface o_skills {
  'id'?: number;
  'name'?: string | null;
  'startTime'?: number | null;
}
export interface o_storyboard {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_storyboardScript {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}
export interface o_user {
  'id'?: number;
  'name'?: string | null;
  'password'?: string | null;
}
export interface o_video {
  'createTime'?: number | null;
  'id'?: number;
  'name'?: string | null;
}

export interface DB {
  "o_agentDeploy": o_agentDeploy;
  "o_artStyle": o_artStyle;
  "o_assets": o_assets;
  "o_event": o_event;
  "o_eventChapter": o_eventChapter;
  "o_model": o_model;
  "o_myTasks": o_myTasks;
  "o_novel": o_novel;
  "o_outline": o_outline;
  "o_outlineNovel": o_outlineNovel;
  "o_project": o_project;
  "o_prompt": o_prompt;
  "o_script": o_script;
  "o_scriptAssets": o_scriptAssets;
  "o_scriptOutline": o_scriptOutline;
  "o_setting": o_setting;
  "o_skills": o_skills;
  "o_storyboard": o_storyboard;
  "o_storyboardScript": o_storyboardScript;
  "o_user": o_user;
  "o_video": o_video;
}
