import * as canvas from './component/canvas.js';
import * as controls from './component/controls.js';
import * as dialogs from './component/dialogs.js';
import * as page from './component/page.js';
import * as pointer from './component/pointer.js';
import * as renderer from './component/renderer.js';
import * as storage from './component/storage.js';
import * as wheel from './component/wheel.js';

storage.setup();
page.setup();
controls.setup();
canvas.setup();
dialogs.setup();
pointer.setup();
wheel.setup();
renderer.setup();
