import { create, load, search, type RawData } from "@orama/orama";

import { searchSchema, type SearchDocument } from "./search-schema";

interface SearchIndexPayload {
  version: 1;
  documents: number;
  index: RawData;
}

const isRawData = (value: unknown): value is RawData => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "internalDocumentIDStore" in value &&
    "index" in value &&
    "docs" in value &&
    "sorting" in value &&
    "pinning" in value &&
    "language" in value &&
    typeof value.language === "string"
  );
};

export const isSearchIndexPayload = (
  value: unknown
): value is SearchIndexPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "version" in value &&
    value.version === 1 &&
    "documents" in value &&
    typeof value.documents === "number" &&
    value.documents > 0 &&
    "index" in value &&
    isRawData(value.index)
  );
};

const createSearchDatabase = () => create({ schema: searchSchema });

type SearchDatabase = ReturnType<typeof createSearchDatabase>;

let databasePromise: Promise<SearchDatabase> | undefined;

const loadSearchDatabase = async (): Promise<SearchDatabase> => {
  const response = await fetch("/search-index.json");

  if (!response.ok) {
    throw new Error(
      `Search index request failed with status ${response.status}.`
    );
  }

  const payload: unknown = await response.json();

  if (!isSearchIndexPayload(payload)) {
    throw new Error("Search index payload is invalid.");
  }

  const database = createSearchDatabase();

  load(database, payload.index);

  return database;
};

const database = (): Promise<SearchDatabase> => {
  databasePromise ??= loadSearchDatabase();

  return databasePromise;
};

export const searchDocs = async (
  rawTerm: string
): Promise<SearchDocument[]> => {
  const term = rawTerm.trim();

  if (!term) {
    return [];
  }

  const results = await search(await database(), {
    term,
    threshold: 0,
    limit: 10,
  });

  return results.hits.map((hit) => hit.document);
};
