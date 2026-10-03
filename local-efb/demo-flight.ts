import {store} from '../build-common/src/systems/instruments/src/EFB/Store/store';
import {example} from '../local-extensions/flight';
import {editFlight,confirmFlight} from '../local-extensions/state';
const W:any=window;W.__EFB_STORE__=store;
W.__LOAD_DEMO_FLIGHT__=()=>{editFlight(example());confirmFlight();};
