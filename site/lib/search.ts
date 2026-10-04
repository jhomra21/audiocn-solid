import {
  create,
  load,
  search,
  type RawData,
} from "@orama/orama";

import {
  searchSchema,
  type SearchDocument,
} from "./search-schema";

interface SearchIndexPayload {
  version: 1;
  documents: number;
  index: RawData;
}

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

  const payload = (await response.json()) as SearchIndexPayload;

  if (payload.version !== 1 || payload.documents < 1) {
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
    limit: 10,
  });

  return results.hits.map((hit) => hit.document);
};
