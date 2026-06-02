export type EventAnnouncementClient = {
  id: string;
  body: string;
  createdAt: string;
  pinned: boolean;
};

type Row = {
  id: string;
  body: string;
  createdAt: Date;
  pinned: boolean;
};

export function toEventAnnouncementClient(a: Row): EventAnnouncementClient {
  return {
    id: a.id,
    body: a.body,
    pinned: !!a.pinned,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
  };
}

