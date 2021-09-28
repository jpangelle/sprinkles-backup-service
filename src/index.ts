import { Storage } from '@google-cloud/storage';
import { v4 as uuid } from 'uuid';
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import * as Sentry from '@sentry/node';

config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const uri = process.env.MONGO_DB_URI;

const mongoDBClient = new MongoClient(uri);

// properly prepare to be PEM type
const GOOGLE_CLOUD_PRIVATE_KEY = process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(
  /\\n/gm,
  '\n',
);

type PresaleEntry = {
  _id: string;
  username: string;
  walletAddress: string;
};

const storage = new Storage({
  projectId: 'sprinkles-327416',
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: GOOGLE_CLOUD_PRIVATE_KEY,
  },
});

setInterval(async () => {
  try {
    await mongoDBClient.connect();
    const database = mongoDBClient.db('wallet-bot');
    const presaleEntriesCollection =
      database.collection<PresaleEntry>('presale-entries');

    const presaleEntriesBucket = storage.bucket('presale-entries');

    const presaleEntries = await presaleEntriesCollection
      .find({})
      .project<PresaleEntry>({ _id: 0 })
      .toArray();

    const file = presaleEntriesBucket.file(`presale-entries-${uuid()}.json`);

    await file.save(JSON.stringify(presaleEntries));
  } catch (error) {
    Sentry.captureException(error);
  }
}, 1000 * 60 * 30); // backs up every 30 minutes
