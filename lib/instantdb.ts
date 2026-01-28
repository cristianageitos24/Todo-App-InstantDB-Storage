import { init, id as generateId } from "@instantdb/react";
import schema from "../Instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || '__YOUR_APP_ID__';

if (APP_ID === '__YOUR_APP_ID__') {
  console.warn('Please set NEXT_PUBLIC_INSTANTDB_APP_ID in .env.local');
}

export const db = init({ appId: APP_ID, schema });
export const id = generateId;
