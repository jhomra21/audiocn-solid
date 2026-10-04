export const searchSchema = {
  id: "string",
  title: "string",
  description: "string",
  content: "string",
  url: "string",
} as const;

export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
}
