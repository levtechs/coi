export interface FileAttachment {
  id?: string;
  type: "file";
  name: string;
  url: string;
  size: number;
  mimeType: string;
}
