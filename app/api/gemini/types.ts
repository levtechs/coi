import { GenerationConfig, ThinkingConfig, Tool, Content } from "@google/genai";

export type MyConfig = {
  generationConfig: GenerationConfig;
  thinkingConfig?: ThinkingConfig;
  tools?: Tool[];
};

export type MyGenerateContentParameters = {
  model: string;
  contents: Content[];
  config: MyConfig;
};