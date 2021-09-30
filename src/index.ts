import { Storage } from '@google-cloud/storage';
import { Datastore } from '@google-cloud/datastore';
import { v4 as uuid } from 'uuid';
import { config } from 'dotenv';
import * as Sentry from '@sentry/node';

config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const GOOGLE_CLOUD_PRIVATE_KEY = process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(
  /\\n/gm,
  '\n',
);

const storage = new Storage({
  projectId: 'sprinkles-327416',
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: GOOGLE_CLOUD_PRIVATE_KEY,
  },
});

const datastore = new Datastore({
  projectId: 'sprinkles-327416',
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: GOOGLE_CLOUD_PRIVATE_KEY,
  },
});

setInterval(async () => {
  try {
    const query = datastore.createQuery('creepy-creams');

    const [results] = await datastore.runQuery(query);

    const presaleEntriesBucket = storage.bucket('presale-entries');

    const presaleEntries = results.map(
      ({ discordUsername, walletAddress }) => ({
        discordUsername,
        walletAddress,
      }),
    );

    const file = presaleEntriesBucket.file(`presale-entries-${uuid()}.json`);

    await file.save(JSON.stringify(presaleEntries));
  } catch (error) {
    Sentry.captureException(error);
  }
}, 1000 * 60 * 30); // backs up every 30 minutes
