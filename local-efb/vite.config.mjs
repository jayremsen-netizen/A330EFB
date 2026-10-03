import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
const require=createRequire(import.meta.url);
const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'..');
const common=path.join(repo,'build-common/src/systems');
const air=path.join(repo,'build-a339x/src/systems');
const tw=require(path.join(common,'instruments/src/EFB/tailwind.config.js'));
tw.content=[path.join(common,'**/*.{tsx,jsx}').replaceAll('\\','/'),path.join(air,'**/*.{tsx,jsx}').replaceAll('\\','/')];
const aliases={
 '@localefb':path.join(repo,'local-extensions'),
 '@instruments/common/index':path.join(root,'render.tsx'),
 '@flybywiresim/fbw-sdk':path.join(root,'sdk.ts'),
 '@flybywiresim/flypad':path.join(common,'instruments/src/EFB/index.ts'),
 '@flybywiresim/msfs-avionics-common':path.join(common,'instruments/src/MsfsAvionicsCommon/index.ts'),
 '@flybywiresim/navigation-display':path.join(common,'instruments/src/ND/index.ts'),
 '@flybywiresim/oanc':path.join(common,'instruments/src/OANC/index.ts'),
 '@failures':path.join(air,'failures/src/index.ts'),
 '@shared':path.join(air,'shared/src'),
 '@simbridge':path.join(air,'simbridge-client/src'),
 '@fmgc':path.join(air,'fmgc/src'),
 '@datalink/common':path.join(common,'datalink/common/src/index.ts'),
 '@datalink/atc':path.join(common,'datalink/atc/src/index.ts'),
 '@datalink/aoc':path.join(common,'datalink/aoc/src/index.ts'),
 '@datalink/router':path.join(common,'datalink/router/src/index.ts'),
 '@atsu/fmsclient':path.join(air,'atsu/fmsclient/src/index.ts'),
 '@instruments/common':path.join(air,'instruments/src/Common'),
 '@localization':path.join(repo,'build-a339x/src/localization'),
 'instruments':path.join(air,'instruments'),
};
export default defineConfig({root,publicDir:path.join(root,'public'),plugins:[react({jsxRuntime:'classic'})],resolve:{alias:aliases},define:{'process.env.VITE_BUILD':'true','process.env.AIRCRAFT_PROJECT_PREFIX':'"a339x"','process.env.AIRCRAFT_VARIANT':'"a330-941"','process.env.CLIENT_ID':'"local-development"','process.env.CLIENT_SECRET':'""','process.env.SENTRY_DSN':'""'},css:{postcss:{plugins:[tailwindcss(tw),autoprefixer()]}},server:{host:'127.0.0.1',port:9696,strictPort:true,fs:{allow:[repo]}},build:{outDir:path.join(root,'dist'),emptyOutDir:true,rollupOptions:{input:{efb:path.join(root,'index.html'),demo:path.join(root,'demo.html')}}}});
