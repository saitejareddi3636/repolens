import type { CollectionSchema } from "deepspace/schema";
export const analysesSchema: CollectionSchema = {
  name: "analyses",
  ownerField: "ownerId",
  collaboratorsField: "collaborators",
  visibilityField: { field: "visibility", value: "public" },
  columns: [
    {
      name: "ownerId",
      storage: "text",
      interpretation: "plain",
      userBound: true,
    },
    { name: "repository", storage: "text", interpretation: "plain" },
    { name: "status", storage: "text", interpretation: "plain" },
    { name: "progress", storage: "number", interpretation: "plain" },
    { name: "message", storage: "text", interpretation: "plain" },
    { name: "analysis", storage: "text", interpretation: { kind: "json" } },
    {
      name: "collaborators",
      storage: "text",
      interpretation: { kind: "json" },
    },
    { name: "visibility", storage: "text", interpretation: "plain" },
    {
      name: "published",
      storage: "number",
      interpretation: { kind: "boolean" },
    },
  ],
  permissions: {
    "*": { read: false, create: false, update: false, delete: false },
    viewer: { read: "shared", create: false, update: false, delete: false },
    member: { read: "shared", create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
};

export const publishedAnalysesSchema: CollectionSchema = {
  ...analysesSchema,
  name: "publishedAnalyses",
  permissions: {
    "*": { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
};
delete publishedAnalysesSchema.visibilityField;
