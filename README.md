# NASA

LAMOON is a Moon-base exploration and survival game.

## Play locally

From a checkout containing the LAMOON UI, run:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open [the game at the root route](http://127.0.0.1:5173/). The welcome screen should say **LAMOON**. If the port is occupied, check which checkout the existing Vite process is serving before using that link.

For Level 1, select **Skip Tour & Start Playing**, then exit the Home Center to see the Moon base. For Level 2, select **First Emergency** and follow the arrival prompts. Both levels show the same bottom-center action dock.
